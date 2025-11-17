// Configuration
const API_KEY = 'AIzaSyDIahdoBFJOWKV7FJ3KZP1QqY79hrVKOsE';
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
// State
let answers = {};
let generatedQuestions = [];
const TOTAL_QUESTIONS = 12;

// Screen management
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

// Start assessment
async function startAssessment() {
    answers = {};
    generatedQuestions = [];
    
    showScreen('loadingScreen');
    document.getElementById('loadingTitle').textContent = 'Generating Your Assessment...';
    document.getElementById('loadingText').textContent = 'Our AI is crafting personalized questions just for you';
    
    await generateAllQuestions();
    
    if (generatedQuestions.length > 0) {
        displayAllQuestions();
        showScreen('questionsScreen');
    } else {
        alert('Unable to generate questions. Please try again.');
        showScreen('welcomeScreen');
    }
}

// Generate all questions
async function generateAllQuestions() {
    const prompt = `Generate exactly 12 diverse questions for evaluating active learning strategies. Mix these categories randomly:
- Metacognitive (planning, monitoring learning)
- Cognitive (organizing, processing info)
- Social (collaborative learning)

Return ONLY valid JSON, no markdown:
[{"question":"text","category":"Metacognitive"}]

Questions answerable on 1-5 scale (Rarely to Always).`;

    try {
        const response = await fetch(`${API_URL}?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
            })
        });
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(`API Error: ${data.error.message}`);
        }
        
        if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
            let text = data.candidates[0].content.parts[0].text
                .replace(/```json/g, '').replace(/```/g, '').trim();
            
            const jsonStart = text.indexOf('[');
            const jsonEnd = text.lastIndexOf(']') + 1;
            
            if (jsonStart !== -1 && jsonEnd > jsonStart) {
                text = text.substring(jsonStart, jsonEnd);
            }
            
            const questions = JSON.parse(text);
            
            if (Array.isArray(questions) && questions.length >= 12) {
                generatedQuestions = questions.slice(0, TOTAL_QUESTIONS);
            } else {
                throw new Error('Not enough questions');
            }
        }
    } catch (error) {
        console.error('Error:', error);
        generatedQuestions = [];
    }
}

// Display all questions at once
function displayAllQuestions() {
    const questionsList = document.getElementById('questionsList');
    questionsList.innerHTML = '';
    
    generatedQuestions.forEach((q, index) => {
        const questionCard = document.createElement('div');
        questionCard.className = 'question-card';
        questionCard.innerHTML = `
            <div class="question-number">Question ${index + 1} of ${TOTAL_QUESTIONS}</div>
            <div class="question-text">${q.question}</div>
            <div class="circles-container">
                <div class="circles-labels">
                    <span>Rarely</span>
                    <span>Always</span>
                </div>
                <div class="circles-wrapper">
                    <button class="circle-option" onclick="selectCircle(${index}, 1)">
                        <span>1</span>
                    </button>
                    <button class="circle-option" onclick="selectCircle(${index}, 2)">
                        <span>2</span>
                    </button>
                    <button class="circle-option" onclick="selectCircle(${index}, 3)">
                        <span>3</span>
                    </button>
                    <button class="circle-option" onclick="selectCircle(${index}, 4)">
                        <span>4</span>
                    </button>
                    <button class="circle-option" onclick="selectCircle(${index}, 5)">
                        <span>5</span>
                    </button>
                </div>
            </div>
        `;
        questionsList.appendChild(questionCard);
    });
    
    updateCompletion();
}

// Select circle
function selectCircle(questionIndex, value) {
    answers[questionIndex] = value;
    
    // Update visual selection
    const card = document.querySelectorAll('.question-card')[questionIndex];
    card.classList.add('answered');
    const circles = card.querySelectorAll('.circle-option');
    
    circles.forEach((circle, i) => {
        if (i + 1 === value) {
            circle.classList.add('selected');
        } else {
            circle.classList.remove('selected');
        }
    });
    
    updateCompletion();
}

// Update slider value (removed - no longer needed)
function updateSlider(index, value) {
    // This function is no longer used
}

// Update completion indicator
function updateCompletion() {
    const completed = Object.keys(answers).length;
    document.getElementById('submitBtn').disabled = completed < TOTAL_QUESTIONS;
}

// Submit assessment
async function submitAssessment() {
    showScreen('loadingScreen');
    document.getElementById('loadingTitle').textContent = 'Analyzing Your Learning Style...';
    document.getElementById('loadingText').textContent = 'Our AI is creating your personalized insights';
    
    const scores = calculateScores();
    await generateResults(scores);
}

// Calculate scores
function calculateScores() {
    const categoryScores = {
        Metacognitive: [],
        Cognitive: [],
        Social: []
    };
    
    generatedQuestions.forEach((question, index) => {
        const answer = answers[index] || 3;
        if (categoryScores[question.category]) {
            categoryScores[question.category].push(answer);
        }
    });
    
    const scores = {};
    Object.keys(categoryScores).forEach(category => {
        const categoryAnswers = categoryScores[category];
        const average = categoryAnswers.reduce((sum, val) => sum + val, 0) / categoryAnswers.length;
        scores[category.toLowerCase()] = average;
    });
    
    return scores;
}

// Generate results
async function generateResults(scores) {
    const answerSummary = generatedQuestions.map((q, i) => 
        `Q${i + 1}: ${q.question}\nRating: ${answers[i]}/5`
    ).join('\n\n');
    
    const prompt = `Analyze this learning assessment:

SCORES:
- Metacognitive: ${(scores.metacognitive || 0).toFixed(2)}/5 (${((scores.metacognitive || 0)/5*100).toFixed(0)}%)
- Cognitive: ${(scores.cognitive || 0).toFixed(2)}/5 (${((scores.cognitive || 0)/5*100).toFixed(0)}%)
- Social: ${(scores.social || 0).toFixed(2)}/5 (${((scores.social || 0)/5*100).toFixed(0)}%)

RESPONSES:
${answerSummary}

FORMATTING: Use plain text only. NO ###, **, *. Use ALL CAPS for section headers with colon.

Provide:

LEARNING PROFILE:
Creative 3-5 word title

OVERVIEW:
2 paragraphs on their learning style

METACOGNITIVE ANALYSIS:
Strengths and recommendations

COGNITIVE ANALYSIS:
Strengths and recommendations

SOCIAL ANALYSIS:
Strengths and recommendations

NEXT STEPS:
5 actionable strategies

OPTIMAL ENVIRONMENT:
Ideal learning conditions`;

    try {
        const response = await fetch(`${API_URL}?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });
        
        const data = await response.json();
        
        if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
            displayResults(scores, data.candidates[0].content.parts[0].text);
        } else {
            alert('Unable to generate results.');
            showScreen('questionsScreen');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred.');
        showScreen('questionsScreen');
    }
}

// Display results with visualizations
function displayResults(scores, analysisText) {
    // Draw radar chart
    drawRadarChart(scores);
    
    // Create score cards
    createScoreCards(scores);
    
    // Create bar chart
    createBarChart(scores);
    
    // Display AI analysis
    document.getElementById('analysisContent').textContent = analysisText;
    
    // Create recommendations
    createRecommendations(scores);
    
    showScreen('resultsScreen');
}

// Draw radar chart
function drawRadarChart(scores) {
    const svg = document.getElementById('radarSvg');
    const size = 400;
    const center = size / 2;
    const maxRadius = 150;
    const levels = 5;
    
    // Clear existing
    svg.innerHTML = '';
    
    // Draw background circles
    for (let i = levels; i > 0; i--) {
        const radius = (maxRadius / levels) * i;
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', center);
        circle.setAttribute('cy', center);
        circle.setAttribute('r', radius);
        circle.setAttribute('fill', 'none');
        circle.setAttribute('stroke', 'rgba(255,255,255,0.1)');
        circle.setAttribute('stroke-width', '1');
        svg.appendChild(circle);
    }
    
    // Draw axes
    const categories = ['Metacognitive', 'Cognitive', 'Social'];
    const angles = [0, 120, 240];
    
    categories.forEach((cat, i) => {
        const angle = (angles[i] - 90) * (Math.PI / 180);
        const x2 = center + maxRadius * Math.cos(angle);
        const y2 = center + maxRadius * Math.sin(angle);
        
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', center);
        line.setAttribute('y1', center);
        line.setAttribute('x2', x2);
        line.setAttribute('y2', y2);
        line.setAttribute('stroke', 'rgba(255,255,255,0.2)');
        line.setAttribute('stroke-width', '2');
        svg.appendChild(line);
        
        // Label
        const labelX = center + (maxRadius + 30) * Math.cos(angle);
        const labelY = center + (maxRadius + 30) * Math.sin(angle);
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', labelX);
        text.setAttribute('y', labelY);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('fill', '#fff');
        text.setAttribute('font-size', '14');
        text.setAttribute('font-weight', '600');
        text.textContent = cat;
        svg.appendChild(text);
    });
    
    // Draw data polygon
    const points = [];
    categories.forEach((cat, i) => {
        const score = scores[cat.toLowerCase()] || 0;
        const radius = (score / 5) * maxRadius;
        const angle = (angles[i] - 90) * (Math.PI / 180);
        const x = center + radius * Math.cos(angle);
        const y = center + radius * Math.sin(angle);
        points.push(`${x},${y}`);
    });
    
    const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    polygon.setAttribute('points', points.join(' '));
    polygon.setAttribute('fill', 'rgba(102, 126, 234, 0.3)');
    polygon.setAttribute('stroke', '#667eea');
    polygon.setAttribute('stroke-width', '3');
    svg.appendChild(polygon);
    
    // Draw data points
    points.forEach(point => {
        const [x, y] = point.split(',');
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', x);
        circle.setAttribute('cy', y);
        circle.setAttribute('r', '6');
        circle.setAttribute('fill', '#667eea');
        svg.appendChild(circle);
    });
}

// Create score cards
function createScoreCards(scores) {
    const container = document.getElementById('scoresSection');
    const categories = [
        { name: 'Metacognitive', key: 'metacognitive', icon: '🧠', class: 'purple' },
        { name: 'Cognitive', key: 'cognitive', icon: '💡', class: 'blue' },
        { name: 'Social', key: 'social', icon: '👥', class: 'green' }
    ];
    
    container.innerHTML = categories.map(cat => {
        const score = scores[cat.key] || 0;
        const percentage = ((score / 5) * 100).toFixed(0);
        
        return `
            <div class="score-card">
                <div class="score-header">
                    <div class="score-icon ${cat.class}">${cat.icon}</div>
                    <div class="score-info">
                        <h4>${cat.name}</h4>
                        <div class="score-percentage">${percentage}%</div>
                    </div>
                </div>
                <div class="score-bar">
                    <div class="score-bar-fill ${cat.class}" style="width: ${percentage}%; background: linear-gradient(90deg, ${cat.class === 'purple' ? '#667eea, #764ba2' : cat.class === 'blue' ? '#4facfe, #00f2fe' : '#43e97b, #38f9d7'});"></div>
                </div>
            </div>
        `;
    }).join('');
}

// Create bar chart
function createBarChart(scores) {
    const container = document.getElementById('barChart');
    const categories = [
        { name: 'Metacognitive', key: 'metacognitive', class: 'purple' },
        { name: 'Cognitive', key: 'cognitive', class: 'blue' },
        { name: 'Social', key: 'social', class: 'green' }
    ];
    
    container.innerHTML = categories.map(cat => {
        const score = scores[cat.key] || 0;
        const percentage = ((score / 5) * 100).toFixed(0);
        
        return `
            <div class="bar-item">
                <div class="bar-label">${cat.name}</div>
                <div class="bar-track">
                    <div class="bar-fill ${cat.class}" style="width: ${percentage}%;">
                        ${percentage}%
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Create recommendations
function createRecommendations(scores) {
    const container = document.getElementById('recommendationsContent');
    const recommendations = [
        {
            title: '📚 Study Planning',
            text: 'Set clear learning goals before each study session and review your progress regularly.'
        },
        {
            title: '🎯 Active Recall',
            text: 'Test yourself frequently without looking at notes to strengthen memory retention.'
        },
        {
            title: '👥 Group Learning',
            text: 'Join study groups to discuss concepts and teach others what you\'ve learned.'
        },
        {
            title: '🔄 Spaced Repetition',
            text: 'Review material at increasing intervals to move knowledge to long-term memory.'
        },
        {
            title: '💭 Reflection Time',
            text: 'After learning, take time to reflect on what worked well and what needs improvement.'
        },
        {
            title: '🗺️ Mind Mapping',
            text: 'Create visual diagrams to connect ideas and see relationships between concepts.'
        }
    ];
    
    container.innerHTML = recommendations.map(rec => `
        <div class="recommendation-card">
            <h4>${rec.title}</h4>
            <p>${rec.text}</p>
        </div>
    `).join('');
}

// Restart assessment
function restartAssessment() {
    answers = {};
    generatedQuestions = [];
    showScreen('welcomeScreen');
}