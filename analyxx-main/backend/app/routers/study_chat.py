"""
Study Chat Router — Multi-Model Consensus AI.

ANALYXX's secret sauce: queries multiple AI models in parallel, compares
their outputs, and synthesizes the single best answer.

Supported providers (activate by adding the API key):
  - Groq (Llama 3.3 70B)    — GROQ_API_KEY
  - Google Gemini            — GEMINI_API_KEY
  - Mistral AI               — MISTRAL_API_KEY
  - OpenAI (GPT-4o)         — OPENAI_API_KEY
  - Anthropic (Claude)      — ANTHROPIC_API_KEY

Falls back gracefully: if only 1 key is configured, skips synthesis
and returns that model's answer directly.
"""

import os
import re
import asyncio
from fastapi import APIRouter, Depends, HTTPException, Request, Header
from pydantic import BaseModel, Field
from typing import Optional, Literal
from app.deps import get_current_user_id as get_current_user
from app.rate_limiter import limiter

router = APIRouter()


def _get_user_or_bot(
    authorization: str = Header(default=None),
    x_bot_key: str = Header(default=None, alias="X-Bot-Key"),
) -> str:
    """Accept either a Supabase JWT (web users) or a bot service key (WhatsApp bot)."""
    # Check bot key first (WhatsApp bot calls)
    if x_bot_key and x_bot_key == os.getenv("GROQ_API_KEY"):
        return "whatsapp-bot"
    # Fall back to JWT auth
    if authorization:
        return get_current_user(authorization)
    raise HTTPException(status_code=401, detail="Authentication required.")

# ── Rate limit for study chat ──
STUDY_CHAT_RATE = "15/minute"

# ── Exam context for better responses ──
EXAM_CONTEXTS = {
    "JEE": "JEE Main and Advanced — IIT entrance exam covering Physics, Chemistry, and Mathematics at advanced level",
    "NEET": "NEET — Medical entrance exam covering Physics, Chemistry, and Biology (Botany + Zoology)",
    "UPSC": "UPSC Civil Services — Prelims, Mains, and Interview covering General Studies, Indian Polity, Economy, History, Geography",
    "GATE": "GATE — Graduate Aptitude Test in Engineering, testing core engineering and science subjects",
    "CAT": "CAT — Common Admission Test for MBA, covering Quantitative Aptitude, VARC, and Data Interpretation",
    "SSC": "SSC — Staff Selection Commission exams covering General Intelligence, English, Quantitative Aptitude, General Awareness",
    "CBSE-10": "CBSE Class 10 Board Examination — covering all major subjects at secondary level",
    "CBSE-12": "CBSE Class 12 Board Examination — covering all major subjects at senior secondary level",
    "RTU": "Rajasthan Technical University B.Tech examinations — engineering subjects across all semesters",
}


class StudyChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000, description="The student's question or prompt")
    mode: Literal["explain", "solve", "quiz", "summarize", "predict", "general"] = Field(
        default="general", description="Study mode for contextual responses"
    )
    exam: Optional[str] = Field(default=None, description="Target exam (JEE, NEET, UPSC, etc.)")
    subject: Optional[str] = Field(default=None, description="Subject context (Physics, Math, etc.)")
    chat_history: Optional[list[dict]] = Field(
        default=None, description="Previous messages for conversation context (max 10)"
    )


def _sanitize(value: str, max_length: int = 500) -> str:
    """Sanitize user input before embedding in LLM prompts."""
    value = value.strip()[:max_length]
    value = re.sub(r"[\x00-\x1f\x7f]", "", value)
    return value


def _build_system_prompt(mode: str, exam: Optional[str], subject: Optional[str]) -> str:
    """Build a study-specific system prompt based on mode and exam context."""

    exam_context = ""
    if exam and exam in EXAM_CONTEXTS:
        exam_context = f"\n\nThe student is preparing for: **{EXAM_CONTEXTS[exam]}**. Tailor all answers to this exam's syllabus, difficulty level, and question patterns."
    elif exam:
        exam_context = f"\n\nThe student is preparing for: **{exam}**. Tailor answers to this exam's requirements."

    subject_context = ""
    if subject:
        subject_context = f"\nThe current subject focus is: **{subject}**."

    base_prompt = f"""You are ANALYXX AI — India's smartest AI study assistant, built specifically for Indian students preparing for competitive exams and board examinations.

Your expertise spans:
- JEE Main & Advanced (Physics, Chemistry, Mathematics)
- NEET (Physics, Chemistry, Biology)
- UPSC Civil Services (GS, Polity, Economy, History, Geography)
- GATE (Engineering & Science)
- CAT (QA, VARC, DI/LR)
- SSC (Reasoning, English, Quant, GK)
- CBSE Class 10 & 12 Boards
- RTU B.Tech Exams

CRITICAL RULES:
1. Always provide EXAM-SPECIFIC answers, not generic textbook explanations
2. Reference PYQ patterns and frequently asked topics when relevant
3. Use clear step-by-step formatting with proper markdown
4. Highlight common mistakes students make
5. Include exam-specific tips and tricks
6. Use emojis sparingly for visual structure (📌, ⚡, 💡, ✅, ⚠️)
7. Keep language simple and student-friendly — avoid unnecessary jargon
8. When showing formulas, use LaTeX with dollar-sign delimiters: $x^2$ for inline math and $$\\frac{{a}}{{b}}$$ for display math. NEVER use \\( \\) or \\[ \\] delimiters.
9. Respond in English, but use Hindi terms where commonly used in Indian education context{exam_context}{subject_context}"""

    mode_instructions = {
        "explain": "\n\nCURRENT MODE: EXPLAIN 💡\nExplain the concept with: Core idea, Key Formulas, Worked Example, Common Mistakes, Exam Relevance, Quick Revision Points.",
        "solve": "\n\nCURRENT MODE: SOLVE ✏️\nSolve step-by-step: Understand the problem, Identify approach, Step-by-step solution, Final answer (highlighted), Alternative method, Key takeaway.",
        "quiz": "\n\nCURRENT MODE: QUIZ 🎯\nGenerate 5-8 questions of increasing difficulty. Mix MCQ, numerical, conceptual. Mark difficulty (🟢🟡🔴). Provide solutions after all questions.",
        "summarize": "\n\nCURRENT MODE: SUMMARIZE 📝\nCreate: Topic Overview, Key Concepts (bullets), All Formulas (table), Most Asked Questions, Memory Tricks, 3 Quick Self-check Questions.",
        "predict": "\n\nCURRENT MODE: PREDICT 🔮\nPredict exam topics: High Probability (🔥), Trending Topics, Safe Bets (appear every year), Dark Horses, Study Priority allocation.",
        "general": "\n\nCURRENT MODE: STUDY ASSISTANT 🧠\nHelp with any study question. Be comprehensive, exam-focused, and actionable. Structure with headers and bullets.",
    }

    return base_prompt + mode_instructions.get(mode, mode_instructions["general"])


# ═══════════════════════════════════════════════════════════════
#  Multi-Model Provider Functions
# ═══════════════════════════════════════════════════════════════

async def _query_groq(messages: list[dict], model: str = "llama-3.3-70b-versatile") -> dict:
    """Query Groq API (Llama, Gemma, Mixtral)."""
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return {"provider": f"Groq/{model}", "response": None, "error": "No API key"}
    try:
        from groq import Groq
        client = Groq(api_key=api_key)
        response = await asyncio.to_thread(
            client.chat.completions.create,
            model=model,
            messages=messages,
            max_tokens=2048,
            temperature=0.7,
        )
        return {
            "provider": f"Groq/{model}",
            "response": response.choices[0].message.content,
            "error": None,
        }
    except Exception as e:
        print(f"❌ Groq/{model} error: {e}")
        return {"provider": f"Groq/{model}", "response": None, "error": str(e)}


async def _query_gemini(messages: list[dict]) -> dict:
    """Query Google Gemini API."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return {"provider": "Gemini", "response": None, "error": "No API key"}
    try:
        from google import genai
        client = genai.Client(api_key=api_key)

        # Convert messages to Gemini format
        system_msg = ""
        contents = []
        for msg in messages:
            if msg["role"] == "system":
                system_msg = msg["content"]
            elif msg["role"] == "user":
                contents.append({"role": "user", "parts": [{"text": msg["content"]}]})
            elif msg["role"] == "assistant":
                contents.append({"role": "model", "parts": [{"text": msg["content"]}]})

        response = await asyncio.to_thread(
            client.models.generate_content,
            model="gemini-2.0-flash",
            contents=contents,
            config={
                "system_instruction": system_msg,
                "max_output_tokens": 2048,
                "temperature": 0.7,
            },
        )
        return {
            "provider": "Gemini",
            "response": response.text,
            "error": None,
        }
    except Exception as e:
        print(f"❌ Gemini error: {e}")
        return {"provider": "Gemini", "response": None, "error": str(e)}


async def _query_openai(messages: list[dict]) -> dict:
    """Query OpenAI API (GPT-4o)."""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return {"provider": "OpenAI/GPT-4o", "response": None, "error": "No API key"}
    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key)
        response = await asyncio.to_thread(
            client.chat.completions.create,
            model="gpt-4o-mini",
            messages=messages,
            max_tokens=2048,
            temperature=0.7,
        )
        return {
            "provider": "OpenAI/GPT-4o",
            "response": response.choices[0].message.content,
            "error": None,
        }
    except Exception as e:
        print(f"❌ OpenAI error: {e}")
        return {"provider": "OpenAI/GPT-4o", "response": None, "error": str(e)}


async def _query_anthropic(messages: list[dict]) -> dict:
    """Query Anthropic API (Claude)."""
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        return {"provider": "Claude", "response": None, "error": "No API key"}
    try:
        from anthropic import Anthropic
        client = Anthropic(api_key=api_key)

        # Extract system message and convert to Claude format
        system_msg = ""
        claude_messages = []
        for msg in messages:
            if msg["role"] == "system":
                system_msg = msg["content"]
            else:
                claude_messages.append({"role": msg["role"], "content": msg["content"]})

        response = await asyncio.to_thread(
            client.messages.create,
            model="claude-sonnet-4-20250514",
            system=system_msg,
            messages=claude_messages,
            max_tokens=2048,
            temperature=0.7,
        )
        return {
            "provider": "Claude",
            "response": response.content[0].text,
            "error": None,
        }
    except Exception as e:
        print(f"❌ Claude error: {e}")
        return {"provider": "Claude", "response": None, "error": str(e)}


async def _query_mistral(messages: list[dict]) -> dict:
    """Query Mistral AI API."""
    api_key = os.getenv("MISTRAL_API_KEY")
    if not api_key:
        return {"provider": "Mistral", "response": None, "error": "No API key"}
    try:
        from mistralai import Mistral
        client = Mistral(api_key=api_key)
        response = await asyncio.to_thread(
            client.chat.complete,
            model="mistral-small-latest",
            messages=messages,
            max_tokens=2048,
            temperature=0.7,
        )
        return {
            "provider": "Mistral",
            "response": response.choices[0].message.content,
            "error": None,
        }
    except Exception as e:
        print(f"❌ Mistral error: {e}")
        return {"provider": "Mistral", "response": None, "error": str(e)}


# ═══════════════════════════════════════════════════════════════
#  Synthesis — The Magic Layer
# ═══════════════════════════════════════════════════════════════

async def _synthesize_responses(
    original_question: str,
    responses: list[dict],
    mode: str,
) -> str:
    """
    Take multiple model responses, compare them, and synthesize
    the single best answer. Uses the most capable available model
    as the judge.
    """
    valid_responses = [r for r in responses if r["response"]]

    if len(valid_responses) == 0:
        raise Exception("All AI models failed to respond.")

    if len(valid_responses) == 1:
        # Only one model responded — return it directly
        return valid_responses[0]["response"]

    # Build the synthesis prompt
    model_answers = ""
    for i, r in enumerate(valid_responses, 1):
        model_answers += f"\n\n--- RESPONSE FROM {r['provider']} (Model {i}) ---\n{r['response']}\n--- END MODEL {i} ---"

    synthesis_prompt = f"""You are the ANALYXX AI Synthesizer — a meta-AI that combines multiple AI responses into one perfect answer.

A student asked: "{original_question}"

{len(valid_responses)} different AI models provided their answers below. Your job is to:

1. **Compare** all responses for accuracy, completeness, and clarity
2. **Identify** the best explanations, formulas, examples from each
3. **Synthesize** ONE perfect response that combines the strengths of all models
4. **Correct** any errors found by cross-referencing between models
5. **Format** the final answer with clean markdown structure

RULES:
- If models disagree on a fact, go with the majority or the most authoritative explanation
- Include the best examples and analogies from any model
- Keep the tone student-friendly and exam-focused
- Do NOT mention that multiple models were used — present as one seamless answer
- Do NOT say "Model 1 said..." — just give the best synthesized answer
- Maintain the original study mode formatting ({mode})

{model_answers}

Now synthesize the BEST possible answer:"""

    # Use the first available model for synthesis (prefer Groq for speed)
    api_key = os.getenv("GROQ_API_KEY")
    if api_key:
        try:
            from groq import Groq
            client = Groq(api_key=api_key)
            response = await asyncio.to_thread(
                client.chat.completions.create,
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": synthesis_prompt}],
                max_tokens=3000,
                temperature=0.3,  # Lower temp for more focused synthesis
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"⚠️ Synthesis via Groq failed: {e}, falling back to best single response")

    # Fallback: return the longest (usually most complete) response
    return max(valid_responses, key=lambda r: len(r["response"]))["response"]


# ═══════════════════════════════════════════════════════════════
#  Main Endpoint
# ═══════════════════════════════════════════════════════════════

@router.post("/chat")
@limiter.limit(STUDY_CHAT_RATE)
async def study_chat(
    request: Request,
    body: StudyChatRequest,
    user_id: str = Depends(_get_user_or_bot),
):
    """
    Multi-Model Consensus Study Chat.

    Queries all available AI models in parallel, synthesizes the best answer.
    """
    safe_message = _sanitize(body.message, max_length=2000)
    if not safe_message:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    system_prompt = _build_system_prompt(body.mode, body.exam, body.subject)

    # Build conversation messages
    messages = [{"role": "system", "content": system_prompt}]

    # Add chat history (max 10 previous messages for context)
    if body.chat_history:
        for msg in body.chat_history[-10:]:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if role in ("user", "assistant") and content:
                messages.append({
                    "role": role,
                    "content": _sanitize(content, max_length=2000),
                })

    # Add current message
    messages.append({"role": "user", "content": safe_message})

    # ── Detect which providers are available ──
    available_tasks = []
    models_used = []

    # Always try Groq (primary — Llama 3.3)
    if os.getenv("GROQ_API_KEY"):
        available_tasks.append(_query_groq(messages, "llama-3.3-70b-versatile"))
        models_used.append("Llama 3.3")

    # Google Gemini
    if os.getenv("GEMINI_API_KEY"):
        available_tasks.append(_query_gemini(messages))
        models_used.append("Gemini")

    # OpenAI GPT
    if os.getenv("OPENAI_API_KEY"):
        available_tasks.append(_query_openai(messages))
        models_used.append("GPT-4o")

    # Anthropic Claude
    if os.getenv("ANTHROPIC_API_KEY"):
        available_tasks.append(_query_anthropic(messages))
        models_used.append("Claude")

    # Mistral AI
    if os.getenv("MISTRAL_API_KEY"):
        available_tasks.append(_query_mistral(messages))
        models_used.append("Mistral")

    # If we have only one provider, also query a second Groq model for diversity
    if len(available_tasks) == 1 and os.getenv("GROQ_API_KEY"):
        available_tasks.append(_query_groq(messages, "gemma2-9b-it"))
        models_used.append("Gemma 2")

    if len(available_tasks) == 0:
        raise HTTPException(status_code=500, detail="No AI models configured.")

    try:
        print(f"🧠 Multi-model query: {len(available_tasks)} models ({', '.join(models_used)})")

        # Query all models in parallel
        results = await asyncio.gather(*available_tasks, return_exceptions=True)

        # Filter out exceptions
        valid_results = []
        for r in results:
            if isinstance(r, dict) and r.get("response"):
                valid_results.append(r)
                print(f"  ✅ {r['provider']}: {len(r['response'])} chars")
            elif isinstance(r, dict):
                print(f"  ❌ {r['provider']}: {r.get('error', 'No response')}")
            else:
                print(f"  ❌ Exception: {r}")

        if not valid_results:
            raise HTTPException(status_code=500, detail="All AI models failed. Please try again.")

        # Synthesize the best answer
        is_synthesized = len(valid_results) > 1
        if is_synthesized:
            print(f"🔬 Synthesizing from {len(valid_results)} responses...")

        reply = await _synthesize_responses(safe_message, valid_results, body.mode)

        providers_used = [r["provider"] for r in valid_results]
        print(f"✅ Final answer ready ({len(reply)} chars, synthesized={is_synthesized})")

        return {
            "reply": reply,
            "mode": body.mode,
            "status": "success",
            "models_used": providers_used,
            "is_synthesized": is_synthesized,
            "model_count": len(valid_results),
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Study chat error: {e}")
        raise HTTPException(status_code=500, detail="AI study assistant is temporarily unavailable. Please try again.")
