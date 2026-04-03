"""
Mock data store for Study Companion backend.
Replaces a real database during development.
"""

DASHBOARD_DATA = {
    "user": {
        "name": "Alex",
        "level": "L3 Scholar",
        "avatar_initials": "AR",
    },
    "stats": {
        "day_streak": 12,
        "cards_mastered": 248,
        "weekly_focus_hours": 18.5,
        "weekly_focus_goal": 25,
    },
    "quote": {
        "text": "The beautiful thing about learning is that no one can take it away from you.",
        "author": "B.B. King",
    },
    "active_courses": [
        {
            "id": "c1",
            "name": "Cognitive Neuroscience",
            "code": "NEU-401",
            "progress": 68,
            "color": "#6366f1",
            "next_session": "Tomorrow 10:00 AM",
        },
        {
            "id": "c2",
            "name": "Architectural Theory II",
            "code": "ARC-302",
            "progress": 45,
            "color": "#7c3aed",
            "next_session": "Wed 2:00 PM",
        },
    ],
    "todays_plan": [
        {
            "id": "p1",
            "title": "Deep Focus Session",
            "description": "Concentrated study on Neural Plasticity models.",
            "time": "09:00 AM",
            "duration": "90 min",
            "type": "focus",
            "completed": False,
        },
        {
            "id": "p2",
            "title": "Flashcard Review",
            "description": "Spaced repetition for Structural Systems deck.",
            "time": "11:30 AM",
            "duration": "30 min",
            "type": "review",
            "completed": False,
        },
        {
            "id": "p3",
            "title": "Group Workshop",
            "description": "Peer review for Modernism case study.",
            "time": "02:00 PM",
            "duration": "60 min",
            "type": "group",
            "completed": False,
        },
    ],
}

PLANNER_SESSIONS = [
    {
        "id": "s1",
        "subject": "Advanced Calculus",
        "topic": "Integration by Parts & Triple Integrals",
        "status": "active",
        "time_remaining_minutes": 45,
        "color": "#6366f1",
        "progress": 62,
    },
    {
        "id": "s2",
        "subject": "Modern History",
        "topic": "Post-War Economics & The Cold War",
        "status": "scheduled",
        "scheduled_time": "02:00 PM",
        "color": "#7c3aed",
        "progress": 0,
    },
]

CURRICULUM = [
    {
        "id": "cu1",
        "subject": "Vector Calculus",
        "description": "Divergence, Curl, and Green's Theorem mastery.",
        "progress": 75,
        "total_topics": 12,
        "completed_topics": 9,
    },
    {
        "id": "cu2",
        "subject": "Thermodynamics",
        "description": "Laws of Entropy and Heat Transfer Analysis.",
        "progress": 40,
        "total_topics": 10,
        "completed_topics": 4,
    },
]

AI_NUDGES = [
    {
        "id": "n1",
        "type": "spaced_repetition",
        "icon": "brain",
        "title": "Spaced Repetition",
        "message": "Review Calculus flashcards in 2 hours for 85% better retention.",
        "priority": "high",
    },
    {
        "id": "n2",
        "type": "break",
        "icon": "coffee",
        "title": "Optimal Break",
        "message": "You've hit a 90min streak. Take a 10min walk to reset cognitive load.",
        "priority": "medium",
    },
    {
        "id": "n3",
        "type": "hydration",
        "icon": "droplets",
        "title": "Hydration Check",
        "message": "Water intake improves concentration by 14%. Time for a refill.",
        "priority": "low",
    },
]

ASSIGNMENTS = [
    {
        "id": "a1",
        "title": "Advanced Neural Networks",
        "course": "CSC-402",
        "type": "Graduate Thesis",
        "due_date": "2023-10-24",
        "status": "in_progress",
        "priority": "high",
        "days_left": 2,
        "grade": None,
    },
    {
        "id": "a2",
        "title": "Organic Synthesis",
        "course": "CHE-310",
        "type": "Lab Report #8",
        "due_date": "2023-10-28",
        "status": "scheduled",
        "priority": "medium",
        "days_left": 6,
        "grade": None,
    },
    {
        "id": "a3",
        "title": "Market Risk Analysis",
        "course": "FIN-501",
        "type": "Portfolio Analysis",
        "due_date": "2023-10-15",
        "status": "completed",
        "priority": "low",
        "days_left": None,
        "grade": "A",
    },
    {
        "id": "a4",
        "title": "Micro-Expression Journaling",
        "course": "PSY-210",
        "type": "Field Study",
        "due_date": "2023-10-26",
        "status": "in_progress",
        "priority": "medium",
        "days_left": 4,
        "grade": None,
    },
]

ASSIGNMENT_STATS = {
    "total": 24,
    "in_progress": 8,
    "completed": 12,
    "upcoming": 4,
}

CHAT_HISTORY = [
    {
        "id": "m1",
        "role": "assistant",
        "content": "Hello! I've analyzed your notes on Quantum Mechanics. Would you like to review the Uncertainty Principle or should we generate some practice questions based on the latest lecture?",
        "timestamp": "2023-10-24T09:00:00Z",
        "attachment": None,
    },
    {
        "id": "m2",
        "role": "user",
        "content": "Let's start with some practice questions. Focus on the mathematical derivations for the Schrödinger equation if possible.",
        "timestamp": "2023-10-24T09:01:00Z",
        "attachment": None,
    },
    {
        "id": "m3",
        "role": "assistant",
        "content": "Excellent choice. I've prepared a set of 5 challenge questions. I also found a relevant diagram from your textbook that might help with the derivation.",
        "timestamp": "2023-10-24T09:01:30Z",
        "attachment": {
            "name": "Derivation Guide",
            "type": "PDF Document",
            "size": "2.4 MB",
        },
    },
]

CHAT_MOCK_RESPONSES = [
    "That's a great question! Based on your study history, I recommend focusing on the conceptual framework before diving into the mathematics.",
    "I've found 3 relevant sections in your uploaded materials that directly address this topic. Want me to summarize them?",
    "Here's a step-by-step breakdown: First, establish the boundary conditions, then apply the wave function normalization...",
    "Your confidence in this topic has improved by 23% over the last week. Keep going — you're on track!",
    "I've generated 5 practice problems tailored to your weak areas. Shall we work through them together?",
]

SESSION_FOCUS = {
    "elapsed_minutes": 45,
    "total_minutes": 60,
    "topic": "Quantum Mechanics",
    "confidence_scores": [
        {"topic": "Wave Functions", "score": 78},
        {"topic": "Schrödinger Eq.", "score": 65},
        {"topic": "Uncertainty Principle", "score": 55},
    ],
}
