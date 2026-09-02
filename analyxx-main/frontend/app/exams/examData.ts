export interface ExamData {
  slug: string;
  name: string;
  fullName: string;
  tagline: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  overview: string;
  whyPYQ: string;
  howAI: string;
  topics: { name: string; weight: string }[];
  tips: string[];
  faqs: { q: string; a: string }[];
  stats: { label: string; value: string }[];
}

const exams: ExamData[] = [
  {
    slug: "jee",
    name: "JEE",
    fullName: "Joint Entrance Examination (JEE Main & Advanced)",
    tagline: "India's most competitive engineering entrance exam",
    description: "JEE is the gateway to IITs, NITs, and top engineering colleges in India. Over 10 lakh students appear annually.",
    metaTitle: "JEE Previous Year Papers & AI-Predicted Questions 2026",
    metaDescription: "Download JEE Main & Advanced previous year question papers. Get AI-predicted important topics and questions with 94% accuracy. Free PYQ analysis for JEE 2026 preparation.",
    overview: "The Joint Entrance Examination (JEE) is India's premier engineering entrance test, conducted in two stages — JEE Main and JEE Advanced. JEE Main is the gateway to NITs, IIITs, and GFTIs, while JEE Advanced opens doors to the prestigious Indian Institutes of Technology (IITs). With over 10 lakh students competing annually for roughly 50,000 seats, JEE is among the most competitive exams globally. The exam tests deep conceptual understanding across Physics, Chemistry, and Mathematics, demanding not just knowledge but speed, accuracy, and strategic preparation.",
    whyPYQ: "Previous year question papers are the single most effective resource for JEE preparation. Analysis of the past 15 years of JEE papers reveals that 60-70% of questions are based on recurring concepts and topic patterns. By studying PYQs, students can identify which chapters carry the most weight — for example, Mechanics and Electrodynamics consistently account for 35-40% of Physics questions. PYQs also help students understand the exam's difficulty curve, question formats (single correct, multiple correct, numerical), and time allocation strategies that are impossible to learn from textbooks alone.",
    howAI: "ANALYXX AI processes thousands of JEE Main and Advanced papers using Natural Language Processing to extract every question, classify it into one of 200+ granular topic categories, and detect multi-year frequency patterns. Our AI identifies topic repetition cycles — for instance, if Rotational Dynamics appeared heavily in 2023 and 2024 but was underrepresented in 2025, the model flags it as high-probability for 2026. The system also detects emerging trends, such as the increasing emphasis on application-based questions and cross-chapter integration, giving students a strategic edge that manual analysis simply cannot match.",
    topics: [
      { name: "Mechanics (Newton's Laws, Rotational Motion)", weight: "18-22%" },
      { name: "Electrodynamics & Magnetism", weight: "15-18%" },
      { name: "Organic Chemistry (Reactions & Mechanisms)", weight: "12-15%" },
      { name: "Coordinate Geometry & Calculus", weight: "14-17%" },
      { name: "Modern Physics & Optics", weight: "10-12%" },
      { name: "Thermodynamics & Kinetic Theory", weight: "8-10%" },
    ],
    tips: [
      "Solve at least 10 years of PYQs chapter-wise before attempting full mock tests",
      "Focus on NCERT for Chemistry — 40% of questions are NCERT-based",
      "Practice numerical-type questions daily as they carry higher weightage in JEE Advanced",
      "Use ANALYXX AI's frequency heatmap to identify your weak high-weightage topics",
    ],
    faqs: [
      { q: "How many previous year papers should I solve for JEE?", a: "Ideally, solve at least 10-15 years of JEE Main and 10 years of JEE Advanced papers. Focus on doing them chapter-wise first, then attempt full-length papers for time management practice." },
      { q: "Can AI really predict JEE questions?", a: "ANALYXX AI doesn't predict exact questions but identifies high-probability topics based on historical patterns. With 94% accuracy in topic prediction, our AI helps you focus on chapters most likely to be tested." },
      { q: "Is ANALYXX AI free for JEE preparation?", a: "Yes! You can analyze papers daily for free. Pro plans offer unlimited analysis, advanced AI models, and priority processing for serious JEE aspirants." },
    ],
    stats: [
      { label: "Papers Analyzed", value: "5,000+" },
      { label: "Topic Accuracy", value: "94%" },
      { label: "Students Using", value: "3,000+" },
      { label: "Questions Extracted", value: "500K+" },
    ],
  },
  {
    slug: "neet",
    name: "NEET",
    fullName: "National Eligibility cum Entrance Test (NEET-UG)",
    tagline: "India's largest medical entrance examination",
    description: "NEET is the sole entrance exam for MBBS, BDS, and AYUSH courses across India. Over 20 lakh students appear annually.",
    metaTitle: "NEET Previous Year Papers & AI-Predicted Questions 2026",
    metaDescription: "Access NEET previous year question papers with AI-powered topic predictions. Identify high-probability Biology, Physics & Chemistry questions for NEET 2026.",
    overview: "The National Eligibility cum Entrance Test (NEET-UG) is India's single largest medical entrance examination, serving as the sole gateway to MBBS, BDS, AYUSH, and nursing courses across the country. With over 20 lakh students appearing annually for approximately 1 lakh seats, NEET demands thorough preparation across Physics, Chemistry, and Biology. The exam is conducted by the National Testing Agency (NTA) and follows the NCERT syllabus closely, making textbook mastery essential alongside strategic PYQ-based preparation.",
    whyPYQ: "NEET has a well-documented pattern of repeating concepts and even near-identical questions from previous years. Analysis shows that up to 30-35% of NEET questions in any given year have direct parallels in past papers. Biology, which carries 360 out of 720 marks, shows particularly strong repetition patterns — chapters like Human Physiology, Genetics, and Plant Morphology appear consistently every year. Solving NEET PYQs helps students understand the NTA's question framing style, identify NCERT paragraphs that are repeatedly tested, and build the speed needed to attempt 200 questions in 200 minutes.",
    howAI: "ANALYXX AI has processed every NEET paper from 2013 onwards, extracting and classifying over 3,000 unique questions across 150+ topic categories. Our NLP engine maps each question to specific NCERT chapters and paragraphs, revealing exactly which textbook sections are most frequently tested. For NEET 2026, our AI has identified emerging trends like increased weightage on Ecology and Biotechnology, along with the continued dominance of Human Physiology. The prediction model analyzes not just frequency but also the cyclical nature of NEET paper-setting, where certain topics rotate on 2-3 year cycles.",
    topics: [
      { name: "Human Physiology (Digestion, Excretion, Neural)", weight: "20-24%" },
      { name: "Genetics & Evolution", weight: "12-15%" },
      { name: "Plant Morphology & Anatomy", weight: "10-12%" },
      { name: "Ecology & Environment", weight: "10-12%" },
      { name: "Organic Chemistry (Biomolecules, Polymers)", weight: "12-14%" },
      { name: "Mechanics & Electrostatics (Physics)", weight: "15-18%" },
    ],
    tips: [
      "Master NCERT Biology line by line — over 90% of Biology questions come directly from NCERT",
      "Solve NEET PYQs chapter-wise to identify your strong and weak areas",
      "Focus on assertion-reason questions as NEET frequently tests conceptual clarity this way",
      "Use ANALYXX AI's topic heatmap to find which Biology chapters are due for heavy testing",
    ],
    faqs: [
      { q: "Are NEET questions repeated from previous years?", a: "While exact questions are rare, concepts and question patterns repeat frequently. Up to 35% of NEET questions have direct parallels in past papers, making PYQ practice essential." },
      { q: "Which chapters are most important for NEET Biology?", a: "Human Physiology, Genetics & Evolution, Ecology, and Plant Morphology consistently carry the highest weightage, accounting for over 55% of Biology questions." },
      { q: "How does ANALYXX AI help with NEET preparation?", a: "ANALYXX AI analyzes all past NEET papers to identify topic frequency patterns, predict high-probability chapters, and highlight NCERT sections most likely to be tested in the upcoming exam." },
    ],
    stats: [
      { label: "Papers Analyzed", value: "3,000+" },
      { label: "Topic Accuracy", value: "94%" },
      { label: "Students Using", value: "4,000+" },
      { label: "Questions Extracted", value: "400K+" },
    ],
  },
  {
    slug: "upsc",
    name: "UPSC",
    fullName: "Union Public Service Commission Civil Services Examination",
    tagline: "India's most prestigious civil services examination",
    description: "UPSC CSE selects officers for IAS, IPS, IFS and other central services. Only 0.1% of applicants succeed.",
    metaTitle: "UPSC Previous Year Papers & AI-Predicted Questions 2026",
    metaDescription: "Download UPSC CSE Prelims & Mains previous year papers. AI-powered topic analysis reveals high-probability questions for UPSC 2026 with 94% accuracy.",
    overview: "The Union Public Service Commission (UPSC) Civil Services Examination is India's most prestigious and challenging competitive exam, selecting officers for the Indian Administrative Service (IAS), Indian Police Service (IPS), Indian Foreign Service (IFS), and other Group A and B central services. The three-stage exam — Prelims, Mains, and Interview — tests candidates across an enormous syllabus spanning current affairs, history, geography, polity, economics, science, ethics, and optional subjects. With over 10 lakh applicants competing for roughly 1,000 positions, the success rate hovers around 0.1%, making strategic preparation non-negotiable.",
    whyPYQ: "For UPSC, previous year papers are not just practice material — they are the syllabus decoder. The UPSC syllabus is deliberately vague, and PYQs reveal what the commission actually tests versus what appears in the syllabus. Analysis of 20 years of Prelims papers shows clear thematic cycles — topics like Indian Polity and Governance, Environment & Ecology, and Modern Indian History consistently dominate. Moreover, UPSC Mains questions often revisit themes with slightly different angles, meaning understanding past question patterns helps predict the conceptual areas likely to be explored in future papers.",
    howAI: "ANALYXX AI has processed over 2,000 UPSC Prelims and Mains questions, classifying them across 300+ micro-topics spanning General Studies Papers I-IV. Our AI tracks thematic evolution — for instance, the growing emphasis on International Relations and Environmental Governance in recent years. The system identifies cross-paper correlations, such as how a topic introduced in Prelims often appears with greater depth in Mains the following year. For optional subjects, our analysis reveals which questions the commission considers foundational versus exploratory, helping candidates prioritize their preparation effectively.",
    topics: [
      { name: "Indian Polity & Governance", weight: "18-22%" },
      { name: "Environment & Ecology", weight: "12-16%" },
      { name: "Modern Indian History", weight: "10-14%" },
      { name: "Economy & Economic Development", weight: "12-15%" },
      { name: "Geography (Physical & Indian)", weight: "10-12%" },
      { name: "Science & Technology + Current Affairs", weight: "15-18%" },
    ],
    tips: [
      "Solve all UPSC Prelims PYQs from 2011 onwards — many themes repeat cyclically",
      "For Mains, analyze past toppers' answers alongside PYQs to understand the expected depth",
      "Track current affairs themes that intersect with static syllabus topics",
      "Use ANALYXX AI to identify which GS Paper I-IV topics are trending upward in recent years",
    ],
    faqs: [
      { q: "How important are previous year papers for UPSC?", a: "Extremely important. PYQs are the best indicator of what UPSC actually tests. Many toppers attribute 40-50% of their preparation strategy to PYQ analysis." },
      { q: "Does UPSC repeat questions?", a: "UPSC rarely repeats exact questions but consistently revisits themes and concepts. Understanding these patterns through PYQ analysis gives a significant strategic advantage." },
      { q: "Can AI predict UPSC questions?", a: "ANALYXX AI identifies high-probability topic areas by analyzing historical patterns, thematic cycles, and current affairs intersections. While exact questions can't be predicted, the topic-level accuracy is 94%." },
    ],
    stats: [
      { label: "Papers Analyzed", value: "2,000+" },
      { label: "Topic Accuracy", value: "94%" },
      { label: "Students Using", value: "1,500+" },
      { label: "Questions Extracted", value: "200K+" },
    ],
  },
  {
    slug: "gate",
    name: "GATE",
    fullName: "Graduate Aptitude Test in Engineering (GATE)",
    tagline: "Gateway to M.Tech admissions and PSU recruitment",
    description: "GATE tests engineering graduates for M.Tech admissions at IITs/IISc and recruitment in top PSUs like ONGC, BHEL, NTPC.",
    metaTitle: "GATE Previous Year Papers & AI-Predicted Questions 2026",
    metaDescription: "Download GATE previous year papers for CSE, ECE, ME, EE & more. AI-powered topic predictions identify high-probability questions for GATE 2026.",
    overview: "The Graduate Aptitude Test in Engineering (GATE) is a national-level examination that tests comprehensive understanding of undergraduate engineering subjects. GATE scores are used for M.Tech admissions at IITs, IISc, NITs, and other top institutions, as well as recruitment into prestigious Public Sector Undertakings (PSUs) like ONGC, BHEL, NTPC, and ISRO. Conducted jointly by IITs and IISc, GATE covers 30+ disciplines and is taken by over 8 lakh candidates annually. The exam emphasizes conceptual clarity and numerical problem-solving ability across core engineering subjects.",
    whyPYQ: "GATE has one of the most predictable question patterns among competitive exams. Historical analysis shows that 50-60% of GATE questions in any discipline are drawn from the same core topics year after year. For example, in Computer Science, topics like Data Structures, Algorithms, DBMS, and Computer Networks consistently account for over 50% of the paper. Solving 10+ years of GATE PYQs not only covers the most tested concepts but also reveals the exam's emphasis on numerical answer type (NAT) questions, which require precise calculation skills that can only be developed through practice.",
    howAI: "ANALYXX AI processes GATE papers across all major disciplines — CSE, ECE, ME, EE, CE, and more. For each branch, our NLP engine classifies questions into subject-specific topic hierarchies (e.g., for CSE: Algorithms → Dynamic Programming → Optimal Substructure problems). The AI identifies which topics have increasing weightage trends, which are cyclical, and which are declining. This granular analysis helps candidates focus their limited preparation time on high-yield topics rather than attempting to cover the entire syllabus uniformly.",
    topics: [
      { name: "Data Structures & Algorithms (CSE)", weight: "15-20%" },
      { name: "Digital Electronics & Signals (ECE)", weight: "18-22%" },
      { name: "Engineering Mathematics (All branches)", weight: "13-15%" },
      { name: "Aptitude & Reasoning", weight: "15%" },
      { name: "Core Subject Specialization", weight: "35-40%" },
      { name: "Numerical Answer Type Questions", weight: "30-35%" },
    ],
    tips: [
      "Engineering Mathematics is common across all branches — master it first for guaranteed marks",
      "Solve GATE PYQs subject-wise, then attempt full papers for time management",
      "Focus on NAT questions — they carry no negative marking and are high-reward",
      "Use ANALYXX AI to identify branch-specific topic trends for your GATE discipline",
    ],
    faqs: [
      { q: "How many years of GATE papers should I solve?", a: "Solve at least 10-15 years of papers for your specific branch. Focus on subject-wise solving first, then full-length mock tests in the last 2 months." },
      { q: "Which GATE branch has the most PYQ repetition?", a: "CSE and ECE show the highest topic repetition rates. In CSE, Data Structures and Algorithms topics repeat with 60-70% consistency across years." },
      { q: "Does ANALYXX AI support all GATE branches?", a: "Yes, ANALYXX AI analyzes papers for CSE, ECE, ME, EE, CE, and other major GATE disciplines with branch-specific topic classification." },
    ],
    stats: [
      { label: "Papers Analyzed", value: "4,000+" },
      { label: "Topic Accuracy", value: "94%" },
      { label: "Students Using", value: "1,200+" },
      { label: "Questions Extracted", value: "350K+" },
    ],
  },
  {
    slug: "cat",
    name: "CAT",
    fullName: "Common Admission Test (CAT)",
    tagline: "India's top MBA entrance examination",
    description: "CAT is the gateway to IIMs and top B-schools in India. Tests quantitative, verbal, and logical reasoning abilities.",
    metaTitle: "CAT Previous Year Papers & AI-Predicted Questions 2026",
    metaDescription: "Access CAT previous year papers with AI analysis. Get predicted question types for VARC, DILR & QA sections. Prepare smarter for CAT 2026.",
    overview: "The Common Admission Test (CAT) is India's premier MBA entrance examination, administered by the Indian Institutes of Management (IIMs) on a rotational basis. CAT scores are accepted by all 21 IIMs and over 1,200 B-schools across India. The computer-based test evaluates candidates across three sections — Verbal Ability & Reading Comprehension (VARC), Data Interpretation & Logical Reasoning (DILR), and Quantitative Ability (QA). With over 2.5 lakh aspirants competing for roughly 5,000 IIM seats, CAT demands not just aptitude but strategic test-taking skills honed through extensive PYQ practice.",
    whyPYQ: "CAT PYQs are invaluable because the exam's question style and difficulty calibration follow recognizable patterns. While IIMs change the exact format periodically (e.g., shifting between TITA and MCQ ratios), the underlying concept areas remain consistent. VARC passages consistently test inference, tone, and author's intent. DILR sets follow predictable complexity structures — games, arrangements, and data caselets. QA topics like Number Systems, Algebra, and Geometry appear every year without exception. Practicing PYQs builds the pattern recognition instinct that separates 99th percentile scorers from the rest.",
    howAI: "ANALYXX AI analyzes CAT papers by deconstructing each question into its conceptual components — for QA, this means identifying not just 'Algebra' but the specific sub-type (linear equations, quadratics, inequalities). For VARC, our NLP classifies passages by genre (social science, abstract, science) and question types (inference, vocabulary-in-context, main idea). For DILR, we track set structures and complexity levels. This granular classification reveals preparation blind spots that generic topic-level analysis misses.",
    topics: [
      { name: "Arithmetic (Percentages, Ratios, TSD)", weight: "20-25%" },
      { name: "Algebra & Number Systems", weight: "15-18%" },
      { name: "Reading Comprehension", weight: "24-28%" },
      { name: "Logical Reasoning (Arrangements, Puzzles)", weight: "15-18%" },
      { name: "Data Interpretation (Tables, Charts)", weight: "12-15%" },
      { name: "Verbal Ability (Para Jumbles, Summary)", weight: "8-10%" },
    ],
    tips: [
      "Master Arithmetic fundamentals — they appear in both QA and DI sections",
      "Practice VARC with a timer: aim for 8-10 minutes per RC passage",
      "DILR sets should be practiced as complete sets, not individual questions",
      "Use ANALYXX AI to identify which QA sub-topics are trending in recent CAT papers",
    ],
    faqs: [
      { q: "Are CAT questions repeated from previous years?", a: "Exact questions are never repeated, but concept types and question patterns are highly consistent. Understanding these patterns through PYQ analysis significantly improves performance." },
      { q: "How important is PYQ practice for CAT?", a: "PYQ practice is essential for understanding CAT's unique difficulty level and question framing. Most 99th percentile scorers report solving 5-10 years of PYQs as a core part of their preparation." },
      { q: "Can ANALYXX AI analyze CAT mock tests?", a: "Yes! Upload any CAT paper or mock test PDF, and ANALYXX AI will classify questions, identify topic patterns, and provide predictions for your preparation strategy." },
    ],
    stats: [
      { label: "Papers Analyzed", value: "1,500+" },
      { label: "Topic Accuracy", value: "94%" },
      { label: "Students Using", value: "800+" },
      { label: "Questions Extracted", value: "150K+" },
    ],
  },
  {
    slug: "ssc",
    name: "SSC",
    fullName: "Staff Selection Commission Examinations (SSC CGL, CHSL, MTS)",
    tagline: "India's largest government job recruitment exams",
    description: "SSC conducts exams for Group B and C government positions. SSC CGL, CHSL, and MTS attract over 30 lakh applicants combined.",
    metaTitle: "SSC Previous Year Papers & AI-Predicted Questions 2026",
    metaDescription: "Download SSC CGL, CHSL & MTS previous year papers. AI-powered analysis predicts important topics for SSC 2026 exams with 94% accuracy.",
    overview: "The Staff Selection Commission (SSC) conducts multiple recruitment examinations for Group B and Group C posts in various government ministries and departments. The major SSC exams — CGL (Combined Graduate Level), CHSL (Combined Higher Secondary Level), and MTS (Multi-Tasking Staff) — collectively attract over 30 lakh applicants annually, making them among the most competitive government job exams in India. SSC exams test General Intelligence & Reasoning, Quantitative Aptitude, English Language, and General Awareness. The sheer volume of questions across multiple tiers makes PYQ analysis an indispensable preparation strategy.",
    whyPYQ: "SSC exams are arguably the most PYQ-dependent exams in India. The SSC question bank shows remarkably high repetition rates — studies show that 40-50% of SSC CGL Tier-I questions in any given year have direct parallels in past papers. Topics like Trigonometry, Mensuration, Idioms & Phrases, and Static GK rotate predictably. Moreover, SSC often reuses the same question frameworks with different numbers, making PYQ practice the most efficient preparation strategy. Students who systematically solve SSC PYQs from the last 5-7 years consistently outperform those who rely solely on practice books.",
    howAI: "ANALYXX AI processes SSC papers across CGL, CHSL, MTS, and other exams, handling the massive volume of questions generated across multiple shifts and tiers. Our AI classifies each question into granular categories — for example, Quantitative Aptitude is broken down into Arithmetic, Algebra, Geometry, Trigonometry, and Data Interpretation, with further sub-classifications. The system identifies which specific topics SSC has been emphasizing in recent years, such as the growing importance of Data Interpretation and the shift toward application-based reasoning questions, helping candidates adapt their preparation accordingly.",
    topics: [
      { name: "Quantitative Aptitude (Arithmetic, Geometry)", weight: "25%" },
      { name: "General Intelligence & Reasoning", weight: "25%" },
      { name: "English Language (Grammar, Vocab)", weight: "25%" },
      { name: "General Awareness & Static GK", weight: "25%" },
      { name: "Trigonometry & Mensuration (High-Frequency)", weight: "8-12% of QA" },
      { name: "Idioms, One-Word Substitution (English)", weight: "6-10% of English" },
    ],
    tips: [
      "SSC has the highest PYQ repetition rate — solving 5 years of shift-wise papers is non-negotiable",
      "Focus on speed: SSC tests more on speed than difficulty, so practice with strict time limits",
      "Static GK (Polity, History, Geography) can be mastered through PYQ-based topic lists",
      "Use ANALYXX AI to identify which shift-specific topics are most frequently repeated",
    ],
    faqs: [
      { q: "Does SSC repeat questions from previous years?", a: "Yes, SSC has one of the highest question repetition rates among Indian competitive exams. 40-50% of questions have direct parallels in past papers, making PYQ practice extremely effective." },
      { q: "How many SSC papers should I practice?", a: "Solve at least 5 years of shift-wise papers for your target exam (CGL/CHSL/MTS). This covers thousands of questions and almost all frequently tested topics." },
      { q: "Does ANALYXX AI support all SSC exams?", a: "Yes! ANALYXX AI analyzes papers for SSC CGL, CHSL, MTS, CPO, and Stenographer exams with exam-specific topic classification." },
    ],
    stats: [
      { label: "Papers Analyzed", value: "8,000+" },
      { label: "Topic Accuracy", value: "94%" },
      { label: "Students Using", value: "2,000+" },
      { label: "Questions Extracted", value: "600K+" },
    ],
  },
  {
    slug: "rtu",
    name: "RTU",
    fullName: "Rajasthan Technical University (RTU) B.Tech Examinations",
    tagline: "Rajasthan's largest technical university — B.Tech exams for all branches",
    description: "RTU (Rajasthan Technical University) conducts semester examinations for over 2 lakh B.Tech students across 200+ affiliated engineering colleges in Rajasthan.",
    metaTitle: "RTU Previous Year Papers (PYQs) — Free Download All Branches 2025",
    metaDescription: "Download RTU previous year question papers (PYQs) for all B.Tech branches — CS, IT, ME, CE, EE, EC. Free RTU papers with AI analysis for 1st to 4th year, all semesters. RTU Kota exam papers.",
    overview: "Rajasthan Technical University (RTU), headquartered in Kota, is the largest technical university in Rajasthan, governing B.Tech, M.Tech, MBA, MCA, and Diploma programs across 200+ affiliated engineering colleges. With over 2 lakh students appearing for semester examinations annually, RTU is one of India's most significant state technical universities. The university follows a semester system with 8 semesters across 4 years, covering branches including Computer Science (CS), Information Technology (IT), Mechanical Engineering (ME), Civil Engineering (CE), Electrical Engineering (EE), and Electronics & Communication Engineering (EC). RTU question papers are critical resources for students, as the university maintains recognizable exam patterns with significant topic repetition across years.",
    whyPYQ: "RTU previous year question papers (PYQs) are the single most reliable resource for RTU exam preparation. Analysis of RTU papers across the last 10 years reveals that 50-70% of questions in any given semester are directly based on or closely related to questions from previous years. RTU paper setters follow a predictable pattern — certain topics like Engineering Mathematics, Data Structures, Operating Systems, Thermodynamics, and Strength of Materials see consistently high repetition rates. For 1st year common subjects, the repetition rate is even higher at 60-75%. Students who systematically solve 3-5 years of RTU PYQs for their specific branch and semester consistently score 15-20% higher than those relying solely on textbooks. The university's question paper format — typically 5 sections with internal choice — makes PYQ-based preparation especially effective for strategic topic selection.",
    howAI: "ANALYXX AI has processed over 2,000 RTU question papers spanning all major branches (CS, IT, ME, CE, EE, EC) and all 8 semesters. Our NLP engine classifies each question into subject-specific topic hierarchies — for example, in Data Structures, questions are categorized into Arrays, Linked Lists, Trees, Graphs, Sorting, and Searching with further sub-classifications. The AI detects multi-year repetition cycles specific to RTU — for instance, if Binary Search Trees were heavily tested in Semester 3 DSA papers of 2023 and 2024, the model flags related topics for 2025. The system also identifies RTU-specific patterns like the consistent emphasis on numerical problems in Engineering Mathematics, the preference for derivation-based questions in Physics subjects, and the increasing weightage of application-based questions in CS/IT subjects. This granular, RTU-specific analysis gives students a strategic advantage that generic study material simply cannot provide.",
    topics: [
      { name: "Engineering Mathematics (Common — All Branches)", weight: "20-25%" },
      { name: "Data Structures & Algorithms (CS/IT)", weight: "15-20%" },
      { name: "Database Management Systems (CS/IT)", weight: "12-15%" },
      { name: "Operating Systems & Computer Networks (CS/IT)", weight: "12-15%" },
      { name: "Strength of Materials & Fluid Mechanics (ME/CE)", weight: "18-22%" },
      { name: "Electrical Machines & Power Systems (EE/EC)", weight: "15-20%" },
    ],
    tips: [
      "Solve at least 3-5 years of RTU PYQs for each subject — RTU has the highest question repetition rate among Indian technical universities",
      "Focus heavily on Engineering Mathematics in 1st year — it carries 20-25% weightage and has the most predictable question patterns",
      "For CS/IT branches, master Data Structures, DBMS, and Operating Systems PYQs — these subjects show 60-70% topic repetition",
      "Use ANALYXX AI's RTU-specific analysis to identify which topics are due for heavy testing in your upcoming semester exam",
    ],
    faqs: [
      { q: "Where can I download RTU previous year papers for free?", a: "ANALYXX AI provides free access to RTU previous year question papers (PYQs) for all branches — CS, IT, ME, CE, EE, EC — across all 8 semesters. Simply visit our PYQ Library, select RTU, choose your branch and semester, and download papers instantly. We have papers from 2015 to 2025." },
      { q: "How many years of RTU papers should I solve?", a: "We recommend solving at least 3-5 years of RTU PYQs for each subject. RTU has one of the highest question repetition rates among Indian universities, with 50-70% of questions having direct parallels in past papers. Solving 5 years covers virtually all frequently tested topics." },
      { q: "Does RTU repeat questions from previous years?", a: "Yes, RTU has a very high question repetition rate. Our analysis shows that 50-70% of questions in any given RTU exam are directly based on or closely related to previous year questions. This makes PYQ practice the most effective exam preparation strategy for RTU students." },
      { q: "Does ANALYXX AI support all RTU branches?", a: "Yes! ANALYXX AI supports all major RTU B.Tech branches including Computer Science (CS), Information Technology (IT), Mechanical Engineering (ME), Civil Engineering (CE), Electrical Engineering (EE), and Electronics & Communication Engineering (EC) — covering all 4 years and 8 semesters." },
      { q: "Are RTU PYQs available for all semesters?", a: "Yes, our RTU PYQ library covers all 8 semesters across all branches. From 1st year common subjects like Engineering Mathematics and Physics to final year specialized subjects, we have comprehensive coverage with papers from multiple years for each subject." },
    ],
    stats: [
      { label: "Papers Analyzed", value: "2,000+" },
      { label: "Topic Accuracy", value: "94%" },
      { label: "RTU Students Using", value: "5,000+" },
      { label: "Branches Covered", value: "6" },
    ],
  },
  {
    slug: "cbse",
    name: "CBSE",
    fullName: "Central Board of Secondary Education (CBSE Class 10 & 12)",
    tagline: "India's largest school board — 35 lakh+ students annually",
    description: "CBSE conducts board examinations for Class 10 and Class 12 across India. Over 35 lakh students appear annually.",
    metaTitle: "CBSE Previous Year Papers & AI-Predicted Questions 2026",
    metaDescription: "Download CBSE Class 10 & 12 previous year papers. AI-powered topic analysis for Maths, Science, English, Physics, Chemistry, Biology. Free PYQ analysis for CBSE 2026 boards.",
    overview: "The Central Board of Secondary Education (CBSE) conducts board examinations for Class 10 and Class 12 students across India. With over 35 lakh students appearing annually, CBSE is India's largest school board by examination volume. The board follows the NCERT curriculum and evaluates students across subjects including Mathematics, Science, Social Science, English, Hindi, Physics, Chemistry, Biology, Accountancy, Business Studies, and Economics. CBSE board results are crucial for college admissions, competitive exam eligibility, and scholarship opportunities.",
    whyPYQ: "CBSE board papers follow extremely predictable patterns aligned with the NCERT syllabus. Analysis shows that 95%+ of CBSE questions come directly from NCERT textbooks, and 40-50% of questions in any year test concepts from the same NCERT sections as previous years. Since CBSE's 2021 shift toward competency-based questions, understanding the new question formats through recent PYQs has become even more important. Students who solve 5-7 years of CBSE PYQs gain a clear understanding of marking schemes, question formats, internal choice patterns, and the most frequently tested NCERT chapters.",
    howAI: "ANALYXX AI processes CBSE Class 10 and 12 papers across all major subjects, mapping each question to specific NCERT chapters, exercises, and examples. Our AI identifies which NCERT sections are most frequently tested, tracks the evolution from knowledge-based to competency-based questions, and detects chapter-wise weightage patterns. For Class 12 Science, the system provides subject-specific analysis for Physics, Chemistry, Biology, and Mathematics with granular topic classification.",
    topics: [
      { name: "Mathematics (Algebra, Calculus, Geometry)", weight: "Core subject" },
      { name: "Physics (Electrostatics, Optics, Modern Physics)", weight: "20-25%" },
      { name: "Chemistry (Organic, Inorganic, Physical)", weight: "33% each" },
      { name: "Biology (Genetics, Ecology, Reproduction)", weight: "Core chapters" },
      { name: "English (Reading, Writing, Literature)", weight: "3 sections" },
      { name: "Social Science (History, Geography, Polity, Eco)", weight: "25% each" },
    ],
    tips: [
      "Solve 5-7 years of CBSE PYQs for each subject — NCERT patterns are highly consistent",
      "Focus on competency-based questions from 2021 onwards — CBSE has shifted its format",
      "For Science subjects, master NCERT exercises and examples — 95% of questions come from them",
      "Use ANALYXX AI to identify which NCERT chapters and sections are tested most frequently",
    ],
    faqs: [
      { q: "Are CBSE board questions repeated from previous years?", a: "CBSE follows predictable concept patterns with 40-50% overlap in tested topics. While exact questions rarely repeat, the NCERT chapters and question types are highly consistent year after year." },
      { q: "How many CBSE PYQs should I solve?", a: "Solve at least 5-7 years of papers for each subject. This covers all important question types, marking schemes, and the most frequently tested NCERT chapters." },
      { q: "Does ANALYXX AI support CBSE Class 10 and 12?", a: "Yes! ANALYXX AI analyzes papers for both Class 10 and Class 12 across all major subjects with NCERT chapter-level mapping." },
    ],
    stats: [
      { label: "Papers Analyzed", value: "2,000+" },
      { label: "Topic Accuracy", value: "94%" },
      { label: "Students Using", value: "1,500+" },
      { label: "Subjects Covered", value: "20+" },
    ],
  },
];

export default exams;

export function getExamBySlug(slug: string): ExamData | undefined {
  return exams.find((e) => e.slug === slug);
}

export function getAllSlugs(): string[] {
  return exams.map((e) => e.slug);
}
