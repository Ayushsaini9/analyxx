import fitz  # PyMuPDF
import re
from collections import Counter

# ── Topic taxonomy for Indian competitive exams ──
TOPICS = {
    # Mathematics
    "Calculus": ["differentiation", "integration", "derivative", "limit", "continuity", "differential equation", "indefinite", "definite integral"],
    "Algebra": ["matrix", "determinant", "complex number", "polynomial", "sequence", "series", "binomial", "permutation", "combination"],
    "Coordinate Geometry": ["parabola", "ellipse", "hyperbola", "circle", "straight line", "conic", "tangent", "normal"],
    "Trigonometry": ["trigonometric", "sine", "cosine", "tangent", "inverse trig", "identities", "sin", "cos", "tan"],
    "Vectors & 3D": ["vector", "three dimensional", "3d", "dot product", "cross product", "plane", "line in space"],
    "Probability & Statistics": ["probability", "statistics", "random variable", "distribution", "mean", "variance", "bayes"],
    "Sets & Logic": ["set theory", "function", "relation", "logical", "boolean"],

    # Physics
    "Mechanics": ["newton", "force", "motion", "momentum", "friction", "work", "energy", "power", "collision", "kinematics"],
    "Thermodynamics": ["thermodynamics", "heat", "temperature", "entropy", "carnot", "gas law", "isothermal", "adiabatic"],
    "Electrostatics": ["electric field", "coulomb", "capacitor", "charge", "potential", "gauss"],
    "Electromagnetism": ["magnetic field", "electromagnetic", "faraday", "inductance", "flux", "current", "resistance", "circuit"],
    "Optics": ["lens", "mirror", "refraction", "reflection", "wave optics", "interference", "diffraction", "polarization"],
    "Modern Physics": ["photoelectric", "quantum", "nuclear", "radioactive", "atom", "electron", "photon", "bohr"],
    "Waves": ["wave", "sound", "oscillation", "frequency", "amplitude", "resonance", "doppler"],

    # Chemistry
    "Organic Chemistry": ["organic", "alkane", "alkene", "benzene", "isomerism", "reaction mechanism", "functional group", "iupac"],
    "Inorganic Chemistry": ["periodic table", "chemical bonding", "coordination", "metal", "salt", "acid", "base", "oxide"],
    "Physical Chemistry": ["equilibrium", "kinetics", "electrochemistry", "solution", "colligative", "thermochemistry", "mole"],

    # Biology (NEET)
    "Cell Biology": ["cell", "mitosis", "meiosis", "organelle", "membrane", "nucleus", "chromosome"],
    "Genetics": ["dna", "rna", "gene", "genetics", "mutation", "heredity", "mendel"],
    "Human Physiology": ["heart", "lung", "kidney", "digestion", "nervous system", "hormone", "blood"],
    "Plant Biology": ["photosynthesis", "transpiration", "plant", "root", "leaf", "flower", "seed"],
    "Evolution & Ecology": ["evolution", "ecosystem", "biodiversity", "natural selection", "food chain"],

    # General Studies (UPSC)
    "Indian Polity": ["constitution", "parliament", "president", "fundamental rights", "directive", "amendment", "judiciary"],
    "Indian Economy": ["gdp", "inflation", "budget", "fiscal", "monetary policy", "rbi", "trade", "economic"],
    "Indian History": ["mughal", "british", "independence", "revolt", "colonial", "medieval", "ancient india"],
    "Geography": ["climate", "monsoon", "river", "mountain", "soil", "agriculture", "mineral"],
    "Science & Technology": ["technology", "space", "isro", "satellite", "internet", "ai", "biotechnology"],
    "Environment": ["environment", "pollution", "climate change", "biodiversity", "conservation", "carbon"],

    # Verbal / Reasoning (CAT/UPSC)
    "Reading Comprehension": ["passage", "comprehension", "paragraph", "author", "inference"],
    "Quantitative Aptitude": ["percentage", "ratio", "profit", "loss", "time", "speed", "distance", "average"],
    "Data Interpretation": ["table", "graph", "chart", "data", "bar chart", "pie chart"],
    "Logical Reasoning": ["syllogism", "analogy", "series", "coding", "direction", "blood relation"],
}


def extract_text_from_pdf(file_path: str) -> str:
    """Extract all text from a PDF file."""
    try:
        doc = fitz.open(file_path)
        text = ""
        for page in doc:
            text += page.get_text()
        doc.close()
        return text.lower()
    except Exception as e:
        print(f"PDF extraction error: {e}")
        return ""


def classify_topics(text: str) -> list[dict]:
    """Score each topic based on keyword frequency in the text."""
    if not text:
        return []

    scores = {}
    total_words = len(text.split())

    for topic, keywords in TOPICS.items():
        count = 0
        for keyword in keywords:
            # Count occurrences of each keyword
            count += len(re.findall(r'\b' + re.escape(keyword) + r'\b', text))
        if count > 0:
            # Normalize score to 0-100
            score = min(100, round((count / max(total_words, 1)) * 10000))
            scores[topic] = {"count": count, "score": score}

    # Sort by score descending
    sorted_topics = sorted(scores.items(), key=lambda x: x[1]["score"], reverse=True)

    results = []
    for rank, (topic, data) in enumerate(sorted_topics[:15], 1):
        results.append({
            "rank": rank,
            "topic": topic,
            "score": data["score"],
            "keyword_hits": data["count"],
            "confidence": get_confidence(data["score"]),
        })

    return results


def get_confidence(score: int) -> str:
    if score >= 60:
        return "Very High"
    elif score >= 35:
        return "High"
    elif score >= 15:
        return "Medium"
    else:
        return "Low"


def analyze_paper(file_path: str) -> dict:
    """Full pipeline: extract text → classify topics → return results."""
    text = extract_text_from_pdf(file_path)

    if not text:
        return {
            "status": "unreadable",
            "message": "Could not extract text from PDF. It may be a scanned image.",
            "predictions": [],
            "topics_found": 0,
            "total_words": 0,
            "raw_text": "",
        }

    topics = classify_topics(text)
    total_words = len(text.split())

    return {
        "status": "success",
        "total_words": total_words,
        "topics_found": len(topics),
        "predictions": topics,
        "raw_text": text[:10000],
    }
