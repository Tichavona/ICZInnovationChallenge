"""
Funeral Home AI Assistant Module
Demonstrates guided AI for funeral home executives
Based on the training outline: "AI for Funeral Executives"
"""

import streamlit as st
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import random
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots

# Decision Edge Consulting branding colors
DEC_GOLDEN_YELLOW = "#FECC0D"
DEC_BLUE = "#283A8E"
DEC_BLACK = "#232323"
DEC_WHITE = "#FFFFFF"
DEC_SUCCESS_GREEN = "#28a745"
DEC_ERROR_RED = "#dc3545"
DEC_WARNING_ORANGE = "#ffc107"
DEC_INFO_CYAN = "#17a2b8"
DEC_LIGHT_GRAY = "#f8f9fa"
DEC_DARK_GRAY = "#343a40"

def render_funeral_home_assistant():
    """Main function to render the Funeral Home Assistant training module"""
    
    st.markdown("""
        <style>
            /* Force all text to have proper contrast */
            body, .stApp, .main, .css-1d391kg, .stMarkdown, p, li, span, div {
                color: #1a1a1a !important;
            }
            
            /* Headers */
            h1, h2, h3, h4, h5, h6, .stMarkdown h1, .stMarkdown h2, .stMarkdown h3 {
                color: #283A8E !important;
                font-weight: 700 !important;
            }
            
            /* Funeral header styling */
            .funeral-header {
                background: linear-gradient(135deg, #283A8E 0%, #1e3a6e 100%);
                padding: 30px;
                border-radius: 15px;
                margin-bottom: 25px;
                border-left: 8px solid #FECC0D;
                box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            }
            
            .funeral-header h1 {
                color: #FECC0D !important;
                margin: 0 !important;
                font-size: 2.5rem !important;
                font-weight: 800 !important;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
            }
            
            .funeral-header p {
                color: #FFFFFF !important;
                margin: 10px 0 0 0 !important;
                font-size: 1.2rem !important;
                line-height: 1.5 !important;
            }
            
            .funeral-header .subtitle {
                color: #FECC0D !important;
                font-style: italic !important;
                margin-top: 15px !important;
                font-size: 1.1rem !important;
            }
            
            /* Info banner styling */
            .info-banner {
                background: linear-gradient(135deg, #FECC0D 0%, #e6b800 100%);
                color: #1a1a1a !important;
                padding: 25px;
                border-radius: 12px;
                margin: 20px 0;
                border-left: 6px solid #283A8E;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            
            .info-banner strong {
                color: #283A8E !important;
                font-size: 1.2rem;
            }
            
            .info-banner, .info-banner p, .info-banner span {
                color: #1a1a1a !important;
            }
            
            /* Demo box styling */
            .funeral-demo-box {
                background-color: #FFFFFF;
                padding: 20px;
                border-radius: 12px;
                border: 2px solid #283A8E;
                margin: 15px 0;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            
            .funeral-demo-box, .funeral-demo-box p, .funeral-demo-box strong {
                color: #1a1a1a !important;
            }
            
            .funeral-demo-box strong {
                color: #283A8E !important;
                font-size: 1.05rem;
            }
            
            /* Caller message box */
            .caller-message {
                background-color: #e3f2fd;
                padding: 15px;
                border-radius: 10px;
                border-left: 5px solid #283A8E;
                margin: 10px 0;
                color: #1a1a1a !important;
            }
            
            .caller-message strong, .caller-message p {
                color: #1a1a1a !important;
            }
            
            /* AI response box */
            .ai-response {
                background-color: #e8f5e9;
                padding: 15px;
                border-radius: 10px;
                border-left: 5px solid #28a745;
                margin: 10px 0;
                color: #1a1a1a !important;
            }
            
            .ai-response strong, .ai-response p {
                color: #1a1a1a !important;
            }
            
            /* Prompt styling */
            .prompt-good {
                background-color: #d4edda;
                border-left: 5px solid #28a745;
                padding: 15px;
                margin: 10px 0;
                border-radius: 8px;
                color: #155724 !important;
            }
            
            .prompt-good strong, .prompt-good p, .prompt-good code {
                color: #155724 !important;
            }
            
            .prompt-bad {
                background-color: #f8d7da;
                border-left: 5px solid #dc3545;
                padding: 15px;
                margin: 10px 0;
                border-radius: 8px;
                color: #721c24 !important;
            }
            
            .prompt-bad strong, .prompt-bad p, .prompt-bad code {
                color: #721c24 !important;
            }
            
            /* Tip box styling */
            .tip-box {
                background: linear-gradient(135deg, #283A8E 0%, #1e3a6e 100%);
                color: #FFFFFF !important;
                padding: 25px;
                border-radius: 12px;
                margin: 20px 0;
                border: 1px solid #FECC0D;
            }
            
            .tip-box h3 {
                color: #FECC0D !important;
                margin-top: 0 !important;
                margin-bottom: 15px !important;
            }
            
            .tip-box p, .tip-box span, .tip-box li {
                color: #FFFFFF !important;
                line-height: 1.6 !important;
            }
            
            .tip-box strong {
                color: #FECC0D !important;
            }
            
            /* Button styling */
            .stButton > button {
                background-color: #283A8E !important;
                color: #FFFFFF !important;
                border: none !important;
                border-radius: 8px !important;
                padding: 10px 24px !important;
                font-weight: 700 !important;
                font-size: 1rem !important;
                transition: all 0.3s ease !important;
            }
            
            .stButton > button:hover {
                background-color: #FECC0D !important;
                color: #232323 !important;
                transform: translateY(-2px) !important;
            }
            
            /* Radio button styling */
            .stRadio > div {
                display: flex !important;
                flex-direction: row !important;
                gap: 15px !important;
                background-color: #f0f2f6 !important;
                padding: 15px !important;
                border-radius: 12px !important;
                border: 1px solid #283A8E !important;
                flex-wrap: wrap !important;
            }
            
            .stRadio > div > label {
                background-color: #FFFFFF !important;
                padding: 10px 24px !important;
                border-radius: 25px !important;
                border: 2px solid #283A8E !important;
                color: #283A8E !important;
                font-weight: 700 !important;
                cursor: pointer !important;
            }
            
            .stRadio > div > label:hover {
                background-color: #FECC0D !important;
                color: #232323 !important;
            }
            
            .stRadio > div > label[data-baseweb="radio"]:has(input:checked) {
                background-color: #283A8E !important;
                color: #FFFFFF !important;
            }
            
            /* Form element styling */
            .stSelectbox label, .stTextArea label, .stTextInput label, .stNumberInput label {
                color: #283A8E !important;
                font-weight: 700 !important;
            }
            
            input, textarea, .stSelectbox > div > div {
                background-color: #FFFFFF !important;
                border: 2px solid #283A8E !important;
                border-radius: 8px !important;
                color: #1a1a1a !important;
            }
            
            /* Expander styling */
            .streamlit-expanderHeader {
                background-color: #283A8E !important;
                color: #FFFFFF !important;
                border-radius: 8px !important;
                font-weight: 700 !important;
            }
            
            .streamlit-expanderHeader p {
                color: #FFFFFF !important;
            }
            
            /* Alert styling */
            .stAlert {
                border-radius: 10px !important;
                padding: 15px !important;
            }
            
            /* Dataframe styling */
            .dataframe {
                font-size: 0.9rem;
            }
            
            .dataframe th {
                background-color: #283A8E !important;
                color: #FFFFFF !important;
                padding: 12px !important;
            }
            
            .dataframe td {
                color: #1a1a1a !important;
                padding: 10px !important;
            }
            
            .caption-text {
                color: #6c757d !important;
                font-size: 0.85rem;
                margin-top: 8px;
                font-style: italic;
            }
            
            hr {
                border-top: 3px solid #FECC0D !important;
                margin: 25px 0 !important;
            }
            
            .scenario-box {
                background-color: #e3f2fd;
                padding: 15px;
                border-radius: 10px;
                margin-bottom: 20px;
                border-left: 5px solid #283A8E;
            }
        </style>
    """, unsafe_allow_html=True)
    
    # Header
    col1, col2 = st.columns([1, 5])
    with col1:
        st.markdown("<h1 style='font-size: 3rem; margin: 0;'>⚰️</h1>", unsafe_allow_html=True)
    with col2:
        st.markdown("""
            <div class="funeral-header">
                <h1>AI for Funeral Executives</h1>
                <p>How to Guide AI to Serve Families Better</p>
                <p class="subtitle">No coding. No algorithms. Just practical direction.</p>
            </div>
        """, unsafe_allow_html=True)
    
    # Key mindset banner
    st.markdown("""
        <div class="info-banner">
            <strong>🗝️ Key Mindset for this Session</strong><br><br>
            AI is like an eager, fast, inexperienced assistant.<br>
            Your job as an executive: Give clear instructions, check the work, and apply your human judgment.<br>
            That's it. That's <strong>"prompt engineering"</strong>.
        </div>
    """, unsafe_allow_html=True)
    
    # Demo selector
    st.markdown("<h3>📋 Live Demonstrations</h3>", unsafe_allow_html=True)
    
    demo_options = {
        "demo1": "📞 Demo 1: Phone & Admin Assistant",
        "demo2": "📝 Demo 2: Memorial Content Creation", 
        "demo3": "📊 Demo 3: Operations & Analytics"
    }
    
    selected_demo = st.radio(
        "Select a demonstration to experience:",
        options=list(demo_options.keys()),
        format_func=lambda x: demo_options[x],
        horizontal=True,
        key="demo_selector_main"
    )
    
    st.markdown("---")
    
    if selected_demo == "demo1":
        render_demo1_phone_assistant()
    elif selected_demo == "demo2":
        render_demo2_content_creation()
    elif selected_demo == "demo3":
        render_demo3_operations_analytics()
    
    # Footer with TRAC method
    st.markdown("---")
    st.markdown("""
        <div class="tip-box">
            <h3>📖 The T.R.A.C. Method</h3>
            <p><strong>T</strong>ell AI the role ("You are a funeral receptionist...")<br>
            <strong>R</strong>equest exactly what you want ("List 3 options for...")<br>
            <strong>A</strong>dd an example ("Write like this sample...")<br>
            <strong>C</strong>heck the output ("Does this sound like us?")</p>
        </div>
    """, unsafe_allow_html=True)
    
    # 30-Day Plan
    with st.expander("📅 Your 30-Day First Steps Plan", expanded=False):
        st.markdown("""
        **Week 1:** Write 3 prompts for tasks you hate (e.g., drafting thank-you notes)
        
        **Week 2:** Try a free tool (ChatGPT or Claude) with your prompts
        
        **Week 3:** Review AI's output together as a team. Fix the prompts.
        
        **Week 4:** Pick one live pilot – after-hours call answer or obituary drafts
        """)
        
        st.markdown("### ✍️ Your Commitment")
        commitment = st.text_input("What is one thing you will guide AI to do for your funeral home this month?", key="commitment_input")
        if commitment:
            st.success(f"✅ Excellent! You've committed to: {commitment}")
            st.balloons()


def render_demo1_phone_assistant():
    """Demo 1: Guiding AI for Phone & Admin Help"""
    
    st.markdown("<h2>📞 Demo 1: After-Hours Call Assistant</h2>", unsafe_allow_html=True)
    
    st.markdown("""
        <div class="scenario-box">
            <strong>📋 Scenario:</strong> A grieving family calls after hours. You need an AI assistant that is calm, 
            compassionate, and knows when to escalate to a human.
        </div>
    """, unsafe_allow_html=True)
    
    col1, col2 = st.columns([1, 1])
    
    with col1:
        st.markdown("<h3>🎯 Your Instructions to AI</h3>", unsafe_allow_html=True)
        
        st.markdown("""
            <div class="prompt-bad">
                <strong>❌ Bad instruction (too vague):</strong><br>
                <code>"Answer the phone"</code>
            </div>
        """, unsafe_allow_html=True)
        
        st.markdown("""
            <div class="prompt-good">
                <strong>✅ Good instruction (clear role + rules):</strong>
            </div>
        """, unsafe_allow_html=True)
        
        assistant_prompt = st.text_area(
            "Write your AI assistant instructions:",
            value="""You are a calm, compassionate funeral home assistant. 
If someone sounds upset, say: 'I'm so sorry for your loss. Let me connect you to a person right away.'
Otherwise, answer basic questions about:
- Visitation hours (Mon-Fri 9am-5pm, Sat 10am-2pm)
- Starting prices ($2,500 - $5,000)
- How to schedule a consultation

Always end with: 'Would you like me to help with anything else?'""",
            height=200,
            key="demo1_assistant_prompt"
        )
        
        st.markdown('<p class="caption-text">💡 Tip: Give AI personality, boundaries, and escalation rules</p>', unsafe_allow_html=True)
    
    with col2:
        st.markdown("<h3>📞 Simulated Caller</h3>", unsafe_allow_html=True)
        
        caller_scenario = st.selectbox(
            "Choose a caller scenario:",
            ["Grieving family member (upset)", "Planning ahead (calm)", "Price inquiry", "Directions question"],
            key="demo1_caller_scenario"
        )
        
        if caller_scenario == "Grieving family member (upset)":
            caller_message = "My father just passed away... I don't know what to do... (crying)"
        elif caller_scenario == "Planning ahead (calm)":
            caller_message = "I'd like to know about your pre-planning options for my mother."
        elif caller_scenario == "Price inquiry":
            caller_message = "What's your cheapest cremation package?"
        else:
            caller_message = "Can you give me directions to your funeral home?"
        
        st.markdown(f"""
            <div class="caller-message">
                <strong>📱 Caller says:</strong><br>
                "{caller_message}"
            </div>
        """, unsafe_allow_html=True)
        
        if st.button("🤖 Generate AI Response", key="demo1_generate_button", use_container_width=True):
            response = simulate_ai_assistant(assistant_prompt, caller_message, caller_scenario)
            st.session_state.funeral_demo1_response = response
            
            st.markdown(f"""
                <div class="ai-response">
                    <strong>🤖 AI Assistant responds:</strong><br>
                    {response.replace(chr(10), '<br>')}
                </div>
            """, unsafe_allow_html=True)
            
            st.info("💭 **Review question:** Does this sound like your funeral home? Would you adjust anything?")
    
    # Teaching moment
    with st.expander("📖 Key Learning: Setting AI Personality & Boundaries", expanded=False):
        st.markdown("""
        **What you just did:**
        1. **Told AI its role** (funeral home assistant)
        2. **Set emotional intelligence rules** (detect upset callers)
        3. **Defined boundaries** (what to answer, what to escalate)
        4. **Established a closing script**
        
        **Without these instructions**, AI might:
        - Sound robotic or inappropriate
        - Try to upsell to a grieving person
        - Hallucinate prices or hours
        - Get stuck in loops
        
        **Example of what happens without instructions:**
        - AI: "Thank you for calling. Our premium package starts at $8,500. Would you like to schedule a consultation?"
        - (Completely inappropriate for someone actively grieving)
        
        **With proper instructions:**
        - AI detects distress → Immediately escalates to human
        - Shows empathy: "I'm so sorry for your loss"
        - Doesn't try to sell or upsell
        """)


def render_demo2_content_creation():
    """Demo 2: Guiding AI to Create Memorial Content"""
    
    st.markdown("<h2>📝 Demo 2: Memorial Content Creation</h2>", unsafe_allow_html=True)
    
    st.markdown("""
        <div class="scenario-box">
            <strong>📋 Scenario:</strong> Create obituaries, eulogy drafts, and memorial programs. 
            Guide AI step by step, like an intern.
        </div>
    """, unsafe_allow_html=True)
    
    # Deceased information
    st.markdown("<h3>📋 Deceased Information</h3>", unsafe_allow_html=True)
    
    col1, col2 = st.columns(2)
    with col1:
        name = st.text_input("Full name", value="Mina Chuwe", key="demo2_name_input")
        age = st.number_input("Age", min_value=0, max_value=120, value=65, key="demo2_age_input")
        gender = st.selectbox("Gender", ["Female", "Male", "Other"], key="demo2_gender_input")
        occupation = st.text_input("Occupation", value="School Teacher", key="demo2_occupation_input")
    
    with col2:
        hobbies = st.text_input("Hobbies/Interests", value="birdwatching, gardening", key="demo2_hobbies_input")
        family = st.text_input("Family members", value="husband Mugura, son Tavada, dog Boki", key="demo2_family_input")
        special_touch = st.text_input("Special detail to include", value="her famous Rupiza", key="demo2_special_input")
    
    # Content type selector
    st.markdown("<h3>📄 Content Type</h3>", unsafe_allow_html=True)
    content_type = st.radio(
        "What would you like to create?",
        ["Eulogy Draft", "Obituary", "Memorial Program", "Thank You Note"],
        horizontal=True,
        key="demo2_content_type_radio"
    )
    
    # Tone selector
    st.markdown("<h3>🎭 Tone</h3>", unsafe_allow_html=True)
    tone = st.select_slider(
        "Tone of the piece:",
        options=["Very Formal", "Formal", "Warm but Respectful", "Celebratory", "Casual Remembrance"],
        value="Warm but Respectful",
        key="demo2_tone_slider"
    )
    
    st.markdown("---")
    
    # Prompt engineering area
    st.markdown("<h3>🎯 Your Prompt Engineering Playground</h3>", unsafe_allow_html=True)
    st.markdown('<p style="color: #283A8E; font-weight: 600;">Write your prompt for the AI. Be specific!</p>', unsafe_allow_html=True)
    
    # Create a dynamic prompt that includes the current values
    pronoun_display = "she/her" if gender == "Female" else "he/him" if gender == "Male" else "they/them"
    user_prompt = st.text_area(
        "Your prompt to AI:",
        value=f"""Write a {tone.lower()} {content_type.lower()} for {name}, age {age} ({pronoun_display}). 
{name} was a {occupation} who loved {hobbies} and spending time with {family}.
Include a reference to {special_touch}.
Keep it to 4-5 sentences. End with one question to ask the family for more memories.""",
        height=150,
        key="demo2_user_prompt"
    )
    
    # Buttons for generation
    col1, col2, col3 = st.columns(3)
    with col1:
        if st.button("✨ Generate Draft", key="demo2_generate_draft", use_container_width=True):
            # Pass the CURRENT values from the input fields including gender
            response = simulate_content_ai(
                content_type=content_type,
                name=name,
                age=age,
                gender=gender,
                occupation=occupation,
                hobbies=hobbies,
                family=family,
                special_touch=special_touch,
                tone=tone
            )
            st.session_state.funeral_demo2_response = response
    
    with col2:
        if st.button("🔄 Refine - More Formal", key="demo2_refine_formal", use_container_width=True):
            response = simulate_content_ai(
                content_type=content_type,
                name=name,
                age=age,
                gender=gender,
                occupation=occupation,
                hobbies=hobbies,
                family=family,
                special_touch=special_touch,
                tone=tone,
                refine_type="more_formal"
            )
            st.session_state.funeral_demo2_response = response
    
    with col3:
        if st.button("💖 Refine - Add Family Detail", key="demo2_refine_family", use_container_width=True):
            response = simulate_content_ai(
                content_type=content_type,
                name=name,
                age=age,
                gender=gender,
                occupation=occupation,
                hobbies=hobbies,
                family=family,
                special_touch=special_touch,
                tone=tone,
                refine_type="more_family"
            )
            st.session_state.funeral_demo2_response = response
    
    # Display the generated response
    if st.session_state.get('funeral_demo2_response'):
        st.markdown("---")
        st.markdown(f"<h3>🎙️ Generated {content_type}</h3>", unsafe_allow_html=True)
        st.markdown(f"""
            <div class="funeral-demo-box">
                {st.session_state.funeral_demo2_response.replace(chr(10), '<br>')}
            </div>
        """, unsafe_allow_html=True)
        
        # Rating
        st.markdown("<h3>⭐ Rate This Draft</h3>", unsafe_allow_html=True)
        rating = st.select_slider(
            "Rate this draft:",
            options=["Needs major revision", "Acceptable with edits", "Good - minor tweaks", "Excellent - ready to use"],
            key="demo2_rating_slider"
        )
        if rating == "Excellent - ready to use":
            st.balloons()
        st.markdown('<p class="caption-text">💡 Remember: AI gives you a draft. You add the heart and personal touch.</p>', unsafe_allow_html=True)
    
    # Side-by-side comparison (vague vs specific prompt)
    with st.expander("🔍 See the Difference: Vague vs Specific Prompts", expanded=False):
        st.markdown("""
            <div class="prompt-bad">
                <strong>❌ Vague prompt:</strong><br>
                <code>"Write an obituary"</code>
            </div>
            <p><strong>Result:</strong> Generic, robotic, missing personal details</p>
            
            <div class="prompt-good" style="margin-top: 20px;">
                <strong>✅ Specific prompt:</strong><br>
                <code>"Write a warm, respectful obituary for a 78-year-old retired firefighter who loved fishing and his grandkids. Use a gentle tone."</code>
            </div>
            <p><strong>Result:</strong> Personalized, warm, includes the details that matter to the family</p>
            
            <div class="info-banner" style="margin-top: 20px; padding: 15px;">
                <strong>📖 Key lesson:</strong> Details matter! AI can't read minds. The more specific you are, including gender pronouns, the better the result.
            </div>
        """, unsafe_allow_html=True)


def render_demo3_operations_analytics():
    """Demo 3: Guiding AI for Operations"""
    
    st.markdown("<h2>📊 Demo 3: Operations & Analytics</h2>", unsafe_allow_html=True)
    
    st.markdown("""
        <div class="scenario-box">
            <strong>📋 Scenario:</strong> Predict busy days, optimize schedules, compare pricing.
            Let AI analyze your data and suggest improvements.
            <br><br>
            <strong>🎯 Your task as executive:</strong> Ask AI the right questions, then apply your judgment to the answers.
        </div>
    """, unsafe_allow_html=True)
    
    # Generate sample call data
    call_data = generate_sample_call_data()
    
    st.markdown("<h3>📈 Your Call Data (Last 12 Months)</h3>", unsafe_allow_html=True)
    st.markdown('<p style="color: #6c757d; font-size: 0.9rem;">Showing complete dataset summary - scroll to see all data</p>', unsafe_allow_html=True)
    
    # Show data preview with more rows
    st.dataframe(call_data.head(20), use_container_width=True)
    
    # Data summary stats
    with st.expander("📊 View Data Summary Statistics", expanded=False):
        col1, col2, col3, col4 = st.columns(4)
        with col1:
            st.metric("Total Calls", f"{call_data['Calls'].sum():,}")
        with col2:
            st.metric("Avg Daily Calls", f"{call_data.groupby('Date')['Calls'].sum().mean():.0f}")
        with col3:
            st.metric("Peak Day", call_data.groupby('Weekday')['Calls'].sum().idxmax())
        with col4:
            st.metric("Peak Hour", f"{call_data.groupby('Hour_Num')['Calls'].sum().idxmax()}:00")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("<h3>🔍 Ask AI to Analyze</h3>", unsafe_allow_html=True)
        
        analysis_type = st.selectbox(
            "What would you like to know?",
            ["When are our busiest days/times?",
             "Suggest schedule changes for removal teams",
             "Compare our cremation prices with competitors",
             "Forecast next month's call volume",
             "What's our peak season?",
             "Show me regional demand patterns"],
            key="demo3_analysis_type"
        )
        
        if st.button("📊 Run Analysis", key="demo3_run_analysis", use_container_width=True):
            analysis = simulate_operations_ai(analysis_type, call_data)
            st.session_state.funeral_demo3_response = analysis
    
    with col2:
        if st.session_state.get('funeral_demo3_response'):
            st.markdown("<h3>🤖 AI Analysis</h3>", unsafe_allow_html=True)
            st.markdown(f"""
                <div class="funeral-demo-box">
                    {st.session_state.funeral_demo3_response.replace(chr(10), '<br>')}
                </div>
            """, unsafe_allow_html=True)
            
            # Follow-up question
            st.markdown("<h4>💭 Your judgment call:</h4>", unsafe_allow_html=True)
            follow_up = st.radio(
                "Do you agree with this recommendation?",
                ["Yes, implement immediately", "Yes, but modify slightly", "No, need more data", "No, doesn't fit our situation"],
                key="demo3_follow_up"
            )
            if follow_up:
                st.info(f"📝 Noted: {follow_up}. Your human judgment is what makes the difference!")
    
    # Visualizations
    st.markdown("---")
    st.markdown("<h3>📊 Data Insights & Visualizations</h3>", unsafe_allow_html=True)
    
    # Create two columns for charts
    viz_col1, viz_col2 = st.columns(2)
    
    with viz_col1:
        # Call volume by day of week
        daily_volume = call_data.groupby('Weekday')['Calls'].sum().reset_index()
        weekday_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        daily_volume['Weekday'] = pd.Categorical(daily_volume['Weekday'], categories=weekday_order, ordered=True)
        daily_volume = daily_volume.sort_values('Weekday')
        
        fig1 = go.Figure()
        fig1.add_trace(go.Bar(
            x=daily_volume['Weekday'],
            y=daily_volume['Calls'],
            marker_color=['#283A8E' if d in ['Thursday', 'Friday'] else '#FECC0D' for d in daily_volume['Weekday']],
            text=daily_volume['Calls'],
            textposition='outside'
        ))
        fig1.update_layout(
            title="Call Volume by Day of Week",
            xaxis_title="Day",
            yaxis_title="Total Calls",
            height=400,
            showlegend=False
        )
        st.plotly_chart(fig1, use_container_width=True)
    
    with viz_col2:
        # Call volume by hour
        hourly_volume = call_data.groupby('Hour_Num')['Calls'].sum().reset_index()
        
        fig2 = go.Figure()
        fig2.add_trace(go.Scatter(
            x=hourly_volume['Hour_Num'],
            y=hourly_volume['Calls'],
            mode='lines+markers',
            line=dict(color='#283A8E', width=3),
            marker=dict(size=8, color='#FECC0D')
        ))
        fig2.update_layout(
            title="Call Volume by Hour of Day",
            xaxis_title="Hour (24-hour format)",
            yaxis_title="Total Calls",
            height=400
        )
        st.plotly_chart(fig2, use_container_width=True)
    
    # Heatmap of calls by day and hour
    st.markdown("<h4>📅 Call Volume Heatmap (Day vs Hour)</h4>", unsafe_allow_html=True)
    
    # Create pivot table for heatmap
    heatmap_data = call_data.pivot_table(
        index='Weekday', 
        columns='Hour_Num', 
        values='Calls', 
        aggfunc='sum',
        fill_value=0
    )
    # Reorder weekdays
    heatmap_data = heatmap_data.reindex(weekday_order)
    
    fig3 = px.imshow(
        heatmap_data.values,
        labels=dict(x="Hour of Day", y="Day of Week", color="Call Volume"),
        x=heatmap_data.columns,
        y=heatmap_data.index,
        color_continuous_scale='YlOrRd',
        aspect="auto"
    )
    fig3.update_layout(height=500)
    st.plotly_chart(fig3, use_container_width=True)
    
    # Call type distribution
    st.markdown("<h4>📞 Call Type Distribution</h4>", unsafe_allow_html=True)
    call_type_dist = call_data['Type'].value_counts()
    
    fig4 = go.Figure(data=[go.Pie(
        labels=call_type_dist.index,
        values=call_type_dist.values,
        hole=0.3,
        marker_colors=[DEC_BLUE, DEC_GOLDEN_YELLOW, '#28a745', '#dc3545', '#17a2b8', '#ffc107']
    )])
    fig4.update_layout(title="What are people calling about?", height=400)
    st.plotly_chart(fig4, use_container_width=True)
    
    # Schedule recommendation section
    st.markdown("---")
    st.markdown("<h3>💡 AI-Generated Schedule Recommendation</h3>", unsafe_allow_html=True)
    
    rec_col1, rec_col2 = st.columns(2)
    
    with rec_col1:
        st.info("""
        **📊 Based on the data analysis:**
        
        **🔴 Busiest periods:** 
        - Thursday and Friday afternoons (2-5 PM)
        - Peak hour: Thursday 3 PM (avg 12 calls)
        
        **🟢 Quietest periods:** 
        - Monday mornings (before 11 AM)
        - Sundays (all day)
        
        **📈 Seasonal patterns:**
        - December-February: 35% higher volume
        - July-August: 20% lower volume
        """)
    
    with rec_col2:
        st.success("""
        **✅ Recommended Actions:**
        
        1. **Removal Teams:**
           - Add 2 extra team members Thu/Fri, 1-6 PM
           - Rotate on-call for Thu/Fri priority
        
        2. **Office Staffing:**
           - Full front-desk coverage Thu/Fri afternoons
           - Move paperwork to Monday mornings
        
        3. **On-Call Rotation:**
           - Shift one person from Mon to Thu rotation
           - Add weekend premium for high-volume periods
        
        **Expected impact:** 40% reduction in missed calls
        """)
    
    # Download data button
    csv = call_data.to_csv(index=False).encode('utf-8')
    st.download_button(
        label="📥 Download Full Call Data (CSV)",
        data=csv,
        file_name=f"funeral_call_data_{datetime.now().strftime('%Y%m%d')}.csv",
        mime="text/csv",
        key="demo3_download"
    )


# ============================================
# SIMULATION FUNCTIONS
# ============================================

def get_pronouns(gender):
    """Return correct pronouns based on gender"""
    if gender == "Female":
        return {
            "subject": "she",
            "object": "her",
            "possessive": "her",
            "reflexive": "herself",
            "possessive_adj": "her"
        }
    elif gender == "Male":
        return {
            "subject": "he",
            "object": "him",
            "possessive": "his",
            "reflexive": "himself",
            "possessive_adj": "his"
        }
    else:  # Other or unspecified
        return {
            "subject": "they",
            "object": "them",
            "possessive": "their",
            "reflexive": "themself",
            "possessive_adj": "their"
        }


def simulate_content_ai(content_type, name, age, gender, occupation, hobbies, family, special_touch, tone="Warm but Respectful", refine_type=None):
    """Simulate AI content generation based on the input values with proper gender pronouns"""
    
    # Get the correct pronouns
    pronouns = get_pronouns(gender)
    subject = pronouns["subject"]
    object_pronoun = pronouns["object"]
    possessive = pronouns["possessive"]
    reflexive = pronouns["reflexive"]
    possessive_adj = pronouns["possessive_adj"]
    
    # Get first name
    first_name = name.split()[0] if ' ' in name else name
    
    # Capitalize first letter of subject for sentence starts
    Subject_cap = subject.capitalize()
    Object_cap = object_pronoun.capitalize()
    
    # Apply refinements based on refine_type
    if refine_type == "more_formal":
        additional_detail = "Maintain a formal, dignified tone throughout. Use traditional language."
    elif refine_type == "more_family":
        additional_detail = f"Emphasize the love and memories shared with {family}."
    else:
        additional_detail = ""
    
    if content_type == "Eulogy Draft":
        return f"""**{name}** lived a life of quiet purpose and abundant love.

**A Life of Service**
For many years, {first_name} dedicated {reflexive} to {occupation}, touching countless lives with {possessive_adj} kindness and dedication. Colleagues and students alike remember {first_name}'s gentle spirit and the way {subject} made everyone feel valued and seen.

**Finding Joy in Simple Things**
Away from work, {first_name} found peace and joy in {hobbies}. These simple pleasures brought {first_name} happiness and provided a source of renewal. {first_name}'s special touch - {special_touch} - became legendary among family and friends, creating memories that will be cherished forever.

**A Devoted Family Member**
Most of all, {first_name} adored {family}. The love {subject} shared with {family.split(',')[0] if ',' in family else family} was evident to all who knew {object_pronoun}. Family gatherings were {first_name}'s greatest joy, and {possessive_adj} legacy of love will live on through those {subject} leaves behind.

{additional_detail}

*Question for the family: What is one small moment with {first_name} that you will carry with you forever?*

*This is a draft. Please review and personalize with specific memories, dates, and locations.*"""

    elif content_type == "Obituary":
        return f"""**{name}**, age {age}, passed away peacefully surrounded by loving family.

**Early Life and Career**
Born and raised in {possessive_adj} beloved community, {first_name} dedicated {reflexive} to {occupation}. Known for {possessive_adj} patience, creativity, and unwavering commitment to excellence, {first_name} made a lasting impact on all who had the privilege of knowing {object_pronoun}.

**Finding Joy**
{Subject_cap} found joy in simple pleasures: {hobbies}. These activities brought {first_name} peace and happiness. {first_name}'s {special_touch} brought comfort and joy to family gatherings.

**Family**
{Subject_cap} is survived by {family}. The love and memories shared will never be forgotten.

**Services**
A celebration of {first_name}'s life will be held on [DATE] at [TIME] at [LOCATION].

{additional_detail}

*Rest in peace. This is a draft. Please add specific dates, locations, and personal memories.*"""

    elif content_type == "Memorial Program":
        return f"""
╔══════════════════════════════════════════════════════════╗
║           CELEBRATION OF LIFE                            ║
║                  {name.upper()}                          ║
║                         {age}                            ║
╚══════════════════════════════════════════════════════════╝

**ORDER OF SERVICE**

*Prelude* - Musical Selection

*Welcome* - Officiant

*Opening Prayer*

*Life Tribute* - {first_name}'s Life and Legacy
- {occupation}
- Beloved {family.split(',')[0] if ',' in family else family}
- Known for {special_touch}

*Musical Selection*

*Memories Shared* - Family and Friends

*Special Remembrance* - Reflecting on {hobbies}

*Musical Selection*

*Closing Prayer*

**RECEPTION TO FOLLOW**
Fellowship Hall | Light refreshments will be served

**MEMORIES OF {first_name.upper()}**

{additional_detail}

---
*This program was created with love. Please take it home as a keepsake of {first_name}'s beautiful life.*"""

    else:  # Thank You Note
        return f"""
**Draft Thank You Note**

Dear [Name],

Your kindness during our time of loss has meant more to us than words can express.

Thank you for [specific act of kindness]. Your thoughtfulness reminded us that we are not alone in our grief.

{first_name} would have been so touched to know how many lives {subject} impacted. We take comfort in knowing that {possessive_adj} legacy of love lives on through all of you.

{additional_detail}

With deepest gratitude,

The Family of {name}

---

*This is a draft. Please personalize with specific details and names.*"""


def simulate_ai_assistant(prompt, caller_message, scenario):
    """Simulate AI assistant response based on prompt instructions"""
    
    is_upset = "upset" in scenario.lower() or "grieving" in scenario.lower() or "crying" in caller_message.lower()
    
    if is_upset:
        return """I'm so sorry for your loss. I can hear that this is very difficult for you.
        
Let me connect you to a person right away. Please hold one moment while I page our on-call director.

[Transferring to human]

*Note: The AI detected distress and escalated appropriately. This is exactly what we want - AI handles routine calls, humans handle sensitive situations.*"""
    
    elif "price" in caller_message.lower() or "cheapest" in caller_message.lower():
        return """Thank you for asking about our pricing. I'd be happy to help.

**Our cremation packages:**
- Simple Cremation: $2,500 (basic services, simple container)
- Standard Cremation: $3,500 (includes memorial service)
- Complete Cremation: $4,500 (full service, urn, memorial)

**Full funeral service packages:**
- Basic Service: $3,500
- Traditional Service: $4,500  
- Premium Service: $5,500

Would you like me to email you our complete price list with all options? Or would you prefer to speak with a funeral director who can explain the differences?

Would you like me to help with anything else?"""
    
    elif "direction" in caller_message.lower():
        return """I'd be glad to help you find us.

**Our location:**
123 Peaceful Lane, Springfield

**Directions from downtown:**
1. Take Main Street north for 2 miles
2. Turn RIGHT onto Peaceful Lane
3. We're 0.3 miles on your LEFT
4. Look for the white building with blue shutters

**Landmarks:** We're right next to the Memorial Gardens cemetery

Would you like me to text these directions to your phone? Or would you prefer directions from a different starting point?

Would you like me to help with anything else?"""
    
    else:
        return """Thank you for reaching out to [Funeral Home Name]. I'd be happy to help you plan ahead.

**Pre-planning options:**
- Schedule a consultation with a Pre-planning Specialist
- Request our pre-planning guide by email
- Set up a virtual appointment from home

**Availability:**
- Monday-Friday: 9 AM - 5 PM
- Saturday: 10 AM - 2 PM
- Sunday: By appointment only

Would you like to schedule a consultation? I can have a Pre-planning Specialist call you back within 24 hours at your convenience.

Would you like me to help with anything else?"""


def generate_sample_call_data():
    """Generate comprehensive sample call data for operations demo"""
    np.random.seed(42)
    
    dates = pd.date_range(start='2023-01-01', end='2024-12-31', freq='D')
    
    data = []
    weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    hours = list(range(6, 22))  # 6 AM to 10 PM
    call_types = ['Death Call', 'Pre-planning', 'General Inquiry', 'Price Check', 'Schedule Change', 'Directions']
    type_weights = [0.35, 0.25, 0.15, 0.10, 0.08, 0.07]
    
    for date in dates:
        weekday = weekdays[date.weekday()]
        month = date.month
        is_holiday_season = month in [12, 1, 2]
        is_summer_slow = month in [7, 8]
        
        for hour in hours:
            # Base call volume with multiple factors
            base_calls = 3
            
            # Day of week factor
            if weekday in ['Thursday', 'Friday']:
                day_factor = 2.5
            elif weekday == 'Saturday':
                day_factor = 1.2
            elif weekday == 'Sunday':
                day_factor = 0.5
            else:
                day_factor = 1.0
            
            # Hour factor
            if 13 <= hour <= 16:
                hour_factor = 2.0
            elif 10 <= hour <= 12:
                hour_factor = 1.5
            elif 17 <= hour <= 19:
                hour_factor = 1.2
            elif hour < 8 or hour > 20:
                hour_factor = 0.3
            else:
                hour_factor = 0.8
            
            # Seasonal factor
            if is_holiday_season:
                season_factor = 1.4
            elif is_summer_slow:
                season_factor = 0.7
            else:
                season_factor = 1.0
            
            # Calculate expected calls
            expected_calls = base_calls * day_factor * hour_factor * season_factor
            
            # Add random variation
            calls = max(0, int(np.random.poisson(expected_calls)))
            
            if calls > 0:
                # Distribute calls by type
                for _ in range(calls):
                    call_type = np.random.choice(call_types, p=type_weights)
                    data.append({
                        'Date': date.strftime('%Y-%m-%d'),
                        'Weekday': weekday,
                        'Hour': f'{hour:02d}:00',
                        'Hour_Num': hour,
                        'Calls': 1,
                        'Type': call_type,
                        'Month': month,
                        'Season': 'Winter Peak' if is_holiday_season else 'Summer Slow' if is_summer_slow else 'Normal'
                    })
    
    # Aggregate by hour for the main dataframe
    df = pd.DataFrame(data)
    if len(df) > 0:
        df = df.groupby(['Date', 'Weekday', 'Hour', 'Hour_Num', 'Month', 'Season', 'Type']).size().reset_index(name='Calls')
    else:
        df = pd.DataFrame(columns=['Date', 'Weekday', 'Hour', 'Hour_Num', 'Month', 'Season', 'Type', 'Calls'])
    
    return df


def simulate_operations_ai(analysis_type, call_data):
    """Simulate AI analysis for operations with comprehensive insights"""
    
    if "busiest" in analysis_type.lower():
        if not call_data.empty:
            busiest_day = call_data.groupby('Weekday')['Calls'].sum().idxmax()
            busiest_hour = call_data.groupby('Hour_Num')['Calls'].sum().idxmax()
            
            return f"""
**📊 Busy Periods Analysis Complete**

Based on your actual call data:

**📅 Busiest days:** {busiest_day} and Friday
**⏰ Busiest times:** 2:00 PM - 5:00 PM (peak at {busiest_hour}:00)

**📈 Detailed breakdown:**

| Time Period | Call Volume | % of Daily Total |
|-------------|-------------|------------------|
| 6 AM - 9 AM | Low (2-4 calls) | 8% |
| 9 AM - 12 PM | Medium (5-8 calls) | 22% |
| 12 PM - 2 PM | Medium-High (8-10 calls) | 18% |
| 2 PM - 5 PM | HIGH (10-15 calls) | 35% ⚠️ PEAK |
| 5 PM - 7 PM | Medium (4-6 calls) | 12% |
| 7 PM - 10 PM | Low (1-2 calls) | 5% |

**🍂 Seasonal patterns identified:**
- **Winter (Dec-Feb):** 40% higher volume
- **Spring (Mar-May):** Normal volume
- **Summer (Jun-Aug):** 25% lower volume
- **Fall (Sep-Nov):** Normal volume

**🎯 Recommendation:** 
Schedule 60% of staff during peak hours (Thu/Fri 2-5 PM) and 30% during Monday mornings.
"""
        else:
            return "Insufficient data for analysis."
    
    elif "schedule" in analysis_type.lower():
        return """
**📋 Staffing Schedule Optimization Recommendations**

**⚠️ Identified issues:**
1. Peak call times (Thu/Fri 2-5 PM) are understaffed
2. Monday morning overstaffed
3. Weekend coverage gaps

**✅ Recommended changes:**

**1. Removal Teams:**
- Add 2 extra team members Thursday and Friday, 1-6 PM
- Reduce Monday team by 1 (reallocate to Thursday)
- Rotate on-call schedule for Thursday/Friday priority

**2. Front Desk Staff:**
- Add 3rd person Thu/Fri 1-5 PM
- Reduce to 1 person Saturday
- Close Sunday (route to on-call only)

**3. On-Call Rotation:**
- Split into two tiers: Primary and Secondary
- Tier 1: Thursday-Saturday (highest volume)
- Tier 2: Sunday-Wednesday (lower volume)

**📊 Expected outcomes:**
- 45% reduction in missed calls
- 30% faster response time during peak hours
- 15% reduction in overtime costs
"""
    
    elif "price" in analysis_type.lower() or "pric" in analysis_type.lower():
        return """
**💰 Competitive Market Price Analysis**

**Your published cremation price:** **$2,500**

**🏪 Comparison with nearby funeral homes:**

| Funeral Home | Cremation Price | Difference |
|--------------|----------------|------------|
| Peaceful Gardens | $2,800 | +$300 |
| Memorial Services | $2,200 | -$300 |
| Serenity Chapel | $2,650 | +$150 |
| Dignity Memorial | $2,900 | +$400 |
| **YOUR HOME** | **$2,500** | **—** |

**📊 Market Position:**
- You are at market average
- Price range: $1,950 - $2,900
- Average market price: $2,500

**💡 Recommendations:**
Implement tiered pricing:
- Basic: $2,000 (Direct cremation only)
- Standard: $2,500 (Current package)
- Premium: $3,000 (Full service package)

**Expected impact:** +15% market share
"""
    
    elif "forecast" in analysis_type.lower():
        return f"""
**📈 Next Month Call Volume Forecast**

**📞 Predicted call volume:** 180-220 calls (↑ 8% from last month)

**📅 Daily breakdown:**
- Monday-Wednesday: 25-30 calls/day
- Thursday: 45-50 calls/day ⚠️ HIGH
- Friday: 40-45 calls/day ⚠️ HIGH
- Saturday: 15-20 calls/day
- Sunday: 5-10 calls/day

**⚠️ High-risk periods:**
- Week of the 15th (+30% above normal)
- Thursday afternoons (peak)

**👥 Staffing recommendation:**
- Thursday: Add 2 extra staff members
- Friday: Add 2 extra staff members
- Monday: Reduce by 1 staff member

**📊 Confidence level:** 85%
"""
    
    elif "peak season" in analysis_type.lower():
        return """
**🌡️ Peak Season Analysis**

**🔴 HIGH SEASON (December - February)**
- Call volume: +40% above baseline
- Death calls: +55%
- Staffing needed: +60%

**🟡 NORMAL SEASON (March - May, September - November)**
- Call volume: Baseline
- Staffing needed: Standard

**🟢 SLOW SEASON (June - August)**
- Call volume: -25% below baseline
- Staffing needed: -30%

**🎯 Recommendations:**
- Peak season: Hire 2-3 seasonal staff
- Normal season: Regular operations
- Slow season: Staff training and facility maintenance
"""
    
    elif "regional" in analysis_type.lower():
        return """
**🗺️ Regional Demand Analysis**

| Region | % of Calls | Avg Response Time |
|--------|------------|-------------------|
| Downtown | 35% | 25 min |
| North Side | 25% | 35 min |
| South Side | 20% | 40 min |
| East Side | 12% | 30 min |
| West Side | 8% | 45 min |

**🎯 Recommendations:**
- Downtown: Station rapid response team
- North Side: Consider satellite office
- West Side: Add second removal team
- South Side: Develop economy package

**Expected impact:** 25% improvement in response times
"""
    
    else:
        return """
**📈 Strategic Business Intelligence Report**

**Key Metrics Summary:**

**Operational KPIs:**
- Average daily calls: 25-30
- Peak hour utilization: 85%
- Response time: 32 minutes

**Financial KPIs:**
- Average revenue per call: $1,200
- Staff cost per call: $450
- Profit margin: 38%
- Year-over-year growth: 12%

**Top 3 Opportunities:**
1. ⭐ **Peak hour staffing** - Add 2 staff Thu/Fri
2. ⭐ **North Side satellite office** - Expand market
3. ⭐ **Tiered pricing** - Increase conversion

**Risk Factors:**
- ⚠️ New competitor opening East Side
- ⚠️ Staff burnout during peak season
- ⚠️ Aging facility needs renovation
"""