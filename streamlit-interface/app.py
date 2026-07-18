import streamlit as st
import pandas as pd
import numpy as np
import warnings
import plotly.express as px 
import plotly.figure_factory as ff
import plotly.graph_objects as go
from plotly.subplots import make_subplots
from authentication import *
import requests
from htmlTemplate import css, bot_template, user_template
from dataHarvesting import main as dtMain
from dbConnection import connString
from userManagement import UserAuth
from streamlit_mic_recorder import mic_recorder
from utils import load_config, get_avatar
from helperFunctions import *
from imageHandler import handle_image
from audioHandler import transcribe_audio
from uploadHandler import uploadHandler
from databaseOperations import load_last_k_text_messages, save_text_message, save_image_message, save_audio_message, load_messages, get_all_chat_history_ids, delete_chat_history
import sqlite3
import os
import base64
import shutil
from werkzeug.utils import secure_filename
from glob import glob as gb
from pathlib import Path 
from datetime import datetime
import pyodbc
from funeralHomeAssistant import render_funeral_home_assistant

# ============================================
# DECISION EDGE CONSULTING BRANDING COLOURS
# ============================================
DEC_GOLDEN_YELLOW = "#FECC0D"
DEC_BLUE = "#283A8E"
DEC_BLACK = "#232323"
DEC_WHITE = "#FFFFFF"
DEC_SUCCESS_GREEN = "#28a745"
DEC_ERROR_RED = "#dc3545"
DEC_WARNING_ORANGE = "#ffc107"
DEC_INFO_CYAN = "#17a2b8"

# Helper functions
def get_risk_level(npl_ratio):
    if npl_ratio < 3:
        return "Low Risk"
    elif npl_ratio < 5:
        return "Moderate Risk"
    elif npl_ratio < 8:
        return "High Risk"
    else:
        return "Critical Risk"

def get_coverage_status(coverage):
    if coverage >= 70:
        return "Strong Coverage"
    elif coverage >= 50:
        return "Adequate Coverage"
    else:
        return "Insufficient Coverage"

# Apply custom CSS for Decision Edge Consulting branding
def apply_decision_edge_branding():
    """Apply Decision Edge Consulting corporate branding CSS"""
    st.markdown(f"""
        <style>
            /* Main container background */
            .stApp {{
                background-color: {DEC_WHITE};
            }}
            
            /* Headers with Decision Edge Blue */
            h1, h2, h3, h4, h5, h6 {{
                color: {DEC_BLUE} !important;
            }}
            
            /* Sidebar styling */
            [data-testid="stSidebar"] {{
                background-color: {DEC_BLACK};
            }}
            
            [data-testid="stSidebar"] .sidebar-content {{
                color: {DEC_WHITE};
            }}
            
            [data-testid="stSidebar"] h1, 
            [data-testid="stSidebar"] h2, 
            [data-testid="stSidebar"] h3, 
            [data-testid="stSidebar"] h4 {{
                color: {DEC_GOLDEN_YELLOW} !important;
            }}
            
            /* Buttons with Decision Edge Blue */
            .stButton > button {{
                background-color: {DEC_BLUE};
                color: {DEC_WHITE};
                border: none;
                border-radius: 5px;
                transition: all 0.3s ease;
            }}
            
            .stButton > button:hover {{
                background-color: {DEC_GOLDEN_YELLOW};
                color: {DEC_BLACK};
                border: none;
            }}
            
            /* Metric cards */
            [data-testid="stMetricValue"] {{
                color: {DEC_BLUE};
            }}
            
            [data-testid="stMetricDelta"] {{
                color: {DEC_GOLDEN_YELLOW};
            }}
            
            [data-testid="stMetricLabel"] {{
                color: {DEC_BLACK} !important;
                font-weight: 600 !important;
            }}
            
            /* Tabs and selectors */
            .stTabs [data-baseweb="tab-list"] button [data-testid="stMarkdownContainer"] p {{
                color: {DEC_BLUE};
            }}
            
            .stTabs [data-baseweb="tab-list"] button[aria-selected="true"] {{
                background-color: {DEC_GOLDEN_YELLOW};
            }}
            
            /* Expander headers */
            .streamlit-expanderHeader {{
                background-color: {DEC_BLUE};
                color: {DEC_WHITE};
                border-radius: 5px;
            }}
            
            /* Success message styling - improved contrast */
            .stAlert[data-baseweb="notification"] {{
                background-color: {DEC_SUCCESS_GREEN} !important;
                color: {DEC_WHITE} !important;
                border-left: 5px solid #155724 !important;
            }}
            
            .stAlert[data-baseweb="notification"] .stMarkdown {{
                color: {DEC_WHITE} !important;
            }}
            
            .stAlert[data-baseweb="notification"] p {{
                color: {DEC_WHITE} !important;
                font-weight: 500 !important;
            }}
            
            /* Error message styling - improved contrast */
            .stAlert[data-baseweb="notification"][kind="error"] {{
                background-color: {DEC_ERROR_RED} !important;
                color: {DEC_WHITE} !important;
                border-left: 5px solid #721c24 !important;
            }}
            
            .stAlert[data-baseweb="notification"][kind="error"] .stMarkdown {{
                color: {DEC_WHITE} !important;
            }}
            
            .stAlert[data-baseweb="notification"][kind="error"] p {{
                color: {DEC_WHITE} !important;
                font-weight: 500 !important;
            }}
            
            /* Warning message styling - improved contrast */
            .stAlert[data-baseweb="notification"][kind="warning"] {{
                background-color: {DEC_WARNING_ORANGE} !important;
                color: {DEC_BLACK} !important;
                border-left: 5px solid #856404 !important;
            }}
            
            .stAlert[data-baseweb="notification"][kind="warning"] .stMarkdown {{
                color: {DEC_BLACK} !important;
            }}
            
            .stAlert[data-baseweb="notification"][kind="warning"] p {{
                color: {DEC_BLACK} !important;
                font-weight: 500 !important;
            }}
            
            /* Info message styling - improved contrast */
            .stAlert[data-baseweb="notification"][kind="info"] {{
                background-color: {DEC_INFO_CYAN} !important;
                color: {DEC_WHITE} !important;
                border-left: 5px solid #0c5460 !important;
            }}
            
            .stAlert[data-baseweb="notification"][kind="info"] .stMarkdown {{
                color: {DEC_WHITE} !important;
            }}
            
            .stAlert[data-baseweb="notification"][kind="info"] p {{
                color: {DEC_WHITE} !important;
                font-weight: 500 !important;
            }}
            
            /* Footer styling */
            .decision-edge-footer {{
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                background-color: {DEC_BLACK};
                color: {DEC_WHITE};
                text-align: center;
                padding: 10px;
                font-size: 14px;
                z-index: 999;
                border-top: 3px solid {DEC_GOLDEN_YELLOW};
            }}
            
            .decision-edge-footer a {{
                color: {DEC_GOLDEN_YELLOW};
                text-decoration: none;
            }}
            
            .decision-edge-footer a:hover {{
                text-decoration: underline;
            }}
            
            /* Logo and branding area */
            .branding-header {{
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 10px 20px;
                background-color: {DEC_WHITE};
                border-bottom: 2px solid {DEC_GOLDEN_YELLOW};
            }}
            
            .branding-title {{
                color: {DEC_BLUE};
                font-size: 24px;
                font-weight: bold;
            }}
            
            .branding-subtitle {{
                color: {DEC_GOLDEN_YELLOW};
                font-size: 16px;
            }}
            
            /* Chat message styling */
            .user-message {{
                background-color: {DEC_BLUE};
                color: {DEC_WHITE};
                border-radius: 15px;
                padding: 10px 15px;
                margin: 5px 0;
            }}
            
            .bot-message {{
                background-color: #f0f0f0;
                color: {DEC_BLACK};
                border-left: 4px solid {DEC_GOLDEN_YELLOW};
                border-radius: 15px;
                padding: 10px 15px;
                margin: 5px 0;
            }}
            
            /* Dataframe styling */
            .dataframe {{
                border-collapse: collapse;
                width: 100%;
            }}
            
            .dataframe th {{
                background-color: {DEC_BLUE};
                color: {DEC_WHITE};
                padding: 8px;
                text-align: left;
            }}
            
            .dataframe td {{
                padding: 8px;
                border-bottom: 1px solid #ddd;
            }}
            
            .dataframe tr:hover {{
                background-color: #f5f5f5;
            }}
            
            /* Download button styling */
            .stDownloadButton > button {{
                background-color: {DEC_BLUE};
                color: {DEC_WHITE};
            }}
            
            .stDownloadButton > button:hover {{
                background-color: {DEC_GOLDEN_YELLOW};
                color: {DEC_BLACK};
            }}
            
            /* Dashboard toggle styling */
            .dashboard-toggle {{
                display: flex;
                justify-content: center;
                gap: 20px;
                margin: 20px 0;
                padding: 15px;
                background-color: #f5f5f5;
                border-radius: 10px;
            }}
            
            .dashboard-toggle button {{
                padding: 10px 30px;
                font-size: 16px;
                font-weight: bold;
                border-radius: 25px;
                cursor: pointer;
                transition: all 0.3s ease;
            }}
            
            .dashboard-toggle button.active {{
                background-color: {DEC_BLUE};
                color: {DEC_WHITE};
                border: none;
            }}
            
            .dashboard-toggle button.inactive {{
                background-color: #e0e0e0;
                color: {DEC_BLACK};
                border: 1px solid #ccc;
            }}
            
            .dashboard-toggle button:hover {{
                transform: translateY(-2px);
                box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            }}
            
            /* Risk indicator styling */
            .risk-high {{
                color: #dc3545;
                font-weight: bold;
            }}
            .risk-medium {{
                color: #ffc107;
                font-weight: bold;
            }}
            .risk-low {{
                color: #28a745;
                font-weight: bold;
            }}
            
            /* KPI Label styling */
            .kpi-label {{
                color: {DEC_BLUE};
                font-weight: 600;
                font-size: 16px;
                margin-bottom: 5px;
            }}
        </style>
        
        <!-- Footer -->
        <div class="decision-edge-footer">
            Muyamuri/Sezani Assistant | Powered by <a href="#" target="_blank">Decision Edge Consultant</a> | © 2024
        </div>
    """, unsafe_allow_html=True)

warnings.filterwarnings('ignore')
config = load_config()

auth = UserAuth(db_conn_str=connString()[0])

# ============================================
# SAFE KPI CALCULATION FUNCTION (FIXED)
# ============================================

def safe_kpi_calculation(value, default=0):
    """Safely calculate KPI values handling various data types"""
    try:
        if value is None:
            return default
        if isinstance(value, pd.Series):
            if len(value) > 0:
                if value.isna().all():
                    return default
                if pd.api.types.is_numeric_dtype(value):
                    return float(value.sum()) if value.sum() is not None else default
                return default
            return default
        elif isinstance(value, pd.DataFrame):
            if value.empty:
                return default
            numeric_cols = value.select_dtypes(include=[np.number]).columns
            if len(numeric_cols) > 0:
                return float(value[numeric_cols].sum().sum())
            return default
        elif isinstance(value, (int, float)):
            return float(value) if not pd.isna(value) else default
        elif isinstance(value, (np.integer, np.floating)):
            return float(value)
        elif isinstance(value, pd.Timestamp):
            return default
        elif isinstance(value, str):
            return default
        else:
            return default
    except Exception as e:
        print(f"Error in safe_kpi_calculation: {e}")
        return default

# ============================================
# POWER UTILITY DASHBOARD (ZETDC)
# ============================================

def render_power_utility_dashboard(filtered_sales_df, sales_df, today):
    """
    Render comprehensive power utility dashboard for ZETDC with KPIs and visualizations
    """
    
    # Header with logo
    col1, col2 = st.columns([1, 3])
    with col1:
        base64_img = get_base64_image("./images/DecisionEdgeLogo.png")
        st.markdown(f"""
            <div style="text-align: left;">
                <img src="data:image/png;base64,{base64_img}" style="width:80%;">
            </div>
        """, unsafe_allow_html=True)
    
    with col2:
        st.title("⚡ ZETDC Power Generation Dashboard")
        st.markdown(f"### Performance Report as at {today}")
        st.markdown("""
            <style>
                .custom-subtitle {
                    text-align: left;
                    color: #FECC0D;
                    font-size: 16px;
                    font-weight: 500;
                    font-style: italic;
                    margin: 5px 0 15px 0;
                    padding: 5px;
                    letter-spacing: 0.5px;
                    background: linear-gradient(90deg, transparent, rgba(254, 204, 13, 0.1), transparent);
                }
            </style>
            <div class="custom-subtitle">
                *For decision making and operational efficiency*
            </div>
        """, unsafe_allow_html=True)
    
    st.markdown("---")
    
    # Check if dataframe is empty
    if filtered_sales_df.empty:
        st.warning("⚠️ No power utility data available. Please generate sample data using the 'Generate Sample Power Generation Data' option in the sidebar.")
        return

    # ============ POWER COMPANY SPECIFIC KPIs ============
    st.subheader("⚡ Power Generation Key Performance Indicators")

    # Calculate power-specific KPIs safely
    try:
        # Energy Generation KPIs (in MWh)
        if 'Energy_Generated_MWh' in filtered_sales_df.columns:
            total_energy_generated = safe_kpi_calculation(filtered_sales_df['Energy_Generated_MWh'].sum())
            total_energy_sold = safe_kpi_calculation(filtered_sales_df['Energy_Sold_MWh'].sum()) if 'Energy_Sold_MWh' in filtered_sales_df.columns else total_energy_generated * 0.95
            total_revenue = safe_kpi_calculation(filtered_sales_df['Revenue'].sum()) if 'Revenue' in filtered_sales_df.columns else safe_kpi_calculation(filtered_sales_df['Sales'].sum()) * 0.1
        else:
            # For retail/sales data
            total_energy_generated = safe_kpi_calculation(filtered_sales_df['Sales'].sum()) * 0.1
            total_energy_sold = total_energy_generated * 0.95
            total_revenue = safe_kpi_calculation(filtered_sales_df['Sales'].sum())
        
        # Calculate budget variances
        if 'Budget_Generation_MWh' in filtered_sales_df.columns:
            budget_generation = safe_kpi_calculation(filtered_sales_df['Budget_Generation_MWh'].sum())
        else:
            budget_generation = total_energy_generated * 1.05
        
        generation_variance = ((total_energy_generated - budget_generation) / budget_generation * 100) if budget_generation > 0 else 0
        
        # Plant efficiency metrics
        if 'Plant_Efficiency_Percent' in filtered_sales_df.columns:
            plant_efficiency = safe_kpi_calculation(filtered_sales_df['Plant_Efficiency_Percent'].mean(), 85.5)
        else:
            plant_efficiency = 85.5
        
        if 'Load_Factor_Percent' in filtered_sales_df.columns:
            load_factor = safe_kpi_calculation(filtered_sales_df['Load_Factor_Percent'].mean(), 72.3)
        else:
            load_factor = 72.3
        
        if 'Availability_Percent' in filtered_sales_df.columns:
            availability = safe_kpi_calculation(filtered_sales_df['Availability_Percent'].mean(), 88.7)
        else:
            availability = 88.7
        
        # Financial metrics
        if 'Operating_Cost' in filtered_sales_df.columns:
            operating_cost = safe_kpi_calculation(filtered_sales_df['Operating_Cost'].sum())
        else:
            operating_cost = total_revenue * 0.6
        
        profit_margin = ((total_revenue - operating_cost) / total_revenue * 100) if total_revenue > 0 else 0
        
        # Customer metrics
        if 'CustomerID' in filtered_sales_df.columns:
            customers_served = safe_kpi_calculation(filtered_sales_df['CustomerID'].nunique(), 0)
        elif 'Customers_Served' in filtered_sales_df.columns:
            customers_served = safe_kpi_calculation(filtered_sales_df['Customers_Served'].sum(), 0)
        else:
            customers_served = 0
        
        if 'Outage_Hours' in filtered_sales_df.columns:
            outage_hours = safe_kpi_calculation(filtered_sales_df['Outage_Hours'].sum(), 0)
        else:
            outage_hours = 0
        
        if 'System_Loss_Percent' in filtered_sales_df.columns:
            system_loss_percent = safe_kpi_calculation(filtered_sales_df['System_Loss_Percent'].mean(), 12.5)
        else:
            system_loss_percent = 12.5
        
    except Exception as e:
        st.warning(f"Some KPI data unavailable: {e}")
        total_energy_generated = total_energy_sold = total_revenue = 0
        generation_variance = plant_efficiency = load_factor = availability = 0
        operating_cost = profit_margin = customers_served = outage_hours = system_loss_percent = 0
        budget_generation = 0
    
    # Main KPIs Row 1 - Generation Performance
    st.markdown('<p class="kpi-label">📊 Generation Performance</p>', unsafe_allow_html=True)
    kpi_col1, kpi_col2, kpi_col3, kpi_col4, kpi_col5 = st.columns(5)
    
    with kpi_col1:
        st.metric("⚡ Energy Generated", f"{total_energy_generated:,.0f} MWh", 
                 delta=f"{generation_variance:+.1f}% vs Budget" if generation_variance != 0 else None,
                 delta_color="inverse" if generation_variance < 0 else "normal")
    with kpi_col2:
        st.metric("💰 Total Revenue", f"${total_revenue:,.2f}", delta=None)
    with kpi_col3:
        st.metric("🏭 Plant Efficiency", f"{plant_efficiency:.1f}%", 
                 delta=f"Target: 90%" if plant_efficiency < 90 else "Above Target")
    with kpi_col4:
        st.metric("📊 Load Factor", f"{load_factor:.1f}%", delta=None)
    with kpi_col5:
        st.metric("🟢 Plant Availability", f"{availability:.1f}%", delta=None)
    
    st.markdown("---")
    
    # Secondary KPIs Row 2 - Operational Metrics
    st.subheader("📈 Operational & Financial Metrics")
    op_col1, op_col2, op_col3, op_col4 = st.columns(4)
    
    with op_col1:
        st.metric("🎯 Profit Margin", f"{profit_margin:.1f}%", 
                 delta=f"Target: 25%" if profit_margin < 25 else "Above Target")
    with op_col2:
        st.metric("🏠 Customers Served", f"{int(customers_served):,}", delta=None)
    with op_col3:
        st.metric("⚠️ System Losses", f"{system_loss_percent:.1f}%", 
                 delta=f"Target: <10%", delta_color="inverse" if system_loss_percent > 10 else "normal")
    with op_col4:
        st.metric("🔧 Outage Hours", f"{outage_hours:,.0f} hrs", delta=None)
    
    st.markdown("---")
    
    # Budget vs Actual Comparison
    st.subheader("📊 Budget vs Actual Performance")
    
    # Create budget vs actual comparison data
    budget_vs_actual = pd.DataFrame({
        'Metric': ['Energy Generation (MWh)', 'Revenue ($M)', 'Operating Cost ($M)', 'Profit ($M)'],
        'Budget': [
            budget_generation / 1000 if budget_generation > 0 else total_energy_generated / 1000 * 1.05,
            (total_revenue * 1.08) / 1000000,
            (operating_cost * 0.95) / 1000000,
            ((total_revenue * 1.08) - (operating_cost * 0.95)) / 1000000
        ],
        'Actual': [
            total_energy_generated / 1000,
            total_revenue / 1000000,
            operating_cost / 1000000,
            (total_revenue - operating_cost) / 1000000
        ]
    })
    
    fig_budget = go.Figure()
    fig_budget.add_trace(go.Bar(name='Budget', x=budget_vs_actual['Metric'], y=budget_vs_actual['Budget'], 
                                marker_color='lightblue'))
    fig_budget.add_trace(go.Bar(name='Actual', x=budget_vs_actual['Metric'], y=budget_vs_actual['Actual'], 
                                marker_color=DEC_BLUE))
    fig_budget.update_layout(title="Budget vs Actual Performance", barmode='group', height=400)
    st.plotly_chart(fig_budget, use_container_width=True)
    
    st.markdown("---")
    
    # ============ TIME SERIES ANALYSIS (Trend lines) ============
    st.subheader("📅 Time Series Analysis - Generation Trends")
    
    if 'Order_Date' in filtered_sales_df.columns or 'OrderDate' in filtered_sales_df.columns or 'Date' in filtered_sales_df.columns:
        date_col = 'Order_Date' if 'Order_Date' in filtered_sales_df.columns else ('OrderDate' if 'OrderDate' in filtered_sales_df.columns else 'Date')
        filtered_sales_df[date_col] = pd.to_datetime(filtered_sales_df[date_col])
        filtered_sales_df["month_year"] = filtered_sales_df[date_col].dt.to_period("M")
        st.markdown(f"""
            <style>
                /* Radio button container with Decision Edge styling */
                .stRadio > div {{
                    background: linear-gradient(135deg, {DEC_BLUE} 0%, #e9ecef 100%);
                    padding: 15px 20px;
                    border-radius: 12px;
                    border: 1px solid #dee2e6;
                    margin: 15px 0;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                }}
                
                /* Individual radio option labels */
                .stRadio label {{
                    font-size: 14px !important;
                    font-weight: 600 !important;
                    color: {DEC_BLACK} !important;
                    background-color: {DEC_GOLDEN_YELLOW} !important;
                    padding: 10px 20px !important;
                    border-radius: 30px !important;
                    margin: 0 6px !important;
                    border: 2px solid {DEC_BLUE} !important;
                    transition: all 0.3s ease !important;
                    cursor: pointer !important;
                    font-family: 'Segoe UI', 'Roboto', sans-serif !important;
                    letter-spacing: 0.3px;
                }}
                
                /* Hover state */
                .stRadio label:hover {{
                    background-color: {DEC_GOLDEN_YELLOW} !important;
                    border-color: {DEC_GOLDEN_YELLOW} !important;
                    color: {DEC_BLACK} !important;
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                }}
                
                /* Selected/Active state */
                .stRadio label[data-baseweb="radio"]:has(input:checked) {{
                    background-color: {DEC_BLUE} !important;
                    border-color: {DEC_BLUE} !important;
                    color: {DEC_WHITE} !important;
                    box-shadow: 0 2px 8px rgba(40, 58, 142, 0.3);
                }}
                
                /* Radio button circle customization */
                .stRadio input[type="radio"] {{
                    accent-color: {DEC_GOLDEN_YELLOW} !important;
                    width: 15px !important;
                    height: 15px !important;
                    margin-right: 8px !important;
                }}
                
                /* Ensure text contrast in all states */
                .stRadio label span {{
                    color: inherit !important;
                    font-weight: 600 !important;
                }}
                
                /* Icons for each option */
                .stRadio label:first-child {{
                    content: "📈";
                }}
                
                /* Horizontal layout */
                .stRadio > div {{
                    display: flex !important;
                    flex-direction: row !important;
                    gap: 10px !important;
                    flex-wrap: wrap !important;
                    justify-content: center !important;
                }}
                
                /* Remove extra spacing */
                .stRadio > div > label {{
                    margin: 0 !important;
                    flex: 0 1 auto;
                }}
                
                /* Section header styling */
                .analysis-header {{
                    font-size: 18px;
                    font-weight: 700;
                    color: {DEC_BLUE};
                    margin-bottom: 10px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }}
            </style>
            
            <div class="analysis-header">
                <span>📊</span>
                <span>Select Analysis View:</span>
            </div>
        """, unsafe_allow_html=True)

        # Radio button with proper contrast
        view = st.radio(
            "",  # Empty label since we added custom header
            ["Energy Generation Trend", "Revenue & Cost Analysis", "Efficiency Metrics Trend", "Monthly Performance Comparison"],
            index=0,
            horizontal=True,
            key="power_trend_view",
            label_visibility="collapsed"
        )
        
        if view == "Energy Generation Trend":
            # Line chart for energy generation trend
            if 'Energy_Generated_MWh' in filtered_sales_df.columns:
                energy_trend_data = filtered_sales_df.groupby(filtered_sales_df["month_year"].dt.strftime("%Y-%m"))["Energy_Generated_MWh"].sum().reset_index()
            else:
                energy_trend_data = filtered_sales_df.groupby(filtered_sales_df["month_year"].dt.strftime("%Y-%m"))["Sales"].sum().reset_index()
                energy_trend_data["Energy_Generated_MWh"] = energy_trend_data["Sales"] * 0.1
                energy_trend_data = energy_trend_data[["month_year", "Energy_Generated_MWh"]]
            
            energy_trend_data.columns = ['Month', 'Energy_Generated_MWh']
            
            fig = go.Figure()
            fig.add_trace(go.Scatter(
                x=energy_trend_data['Month'],
                y=energy_trend_data['Energy_Generated_MWh'],
                name="Energy Generated",
                line=dict(color=DEC_BLUE, width=3),
                fill='tozeroy',
                fillcolor='rgba(40, 58, 142, 0.2)'
            ))
            
            # Add moving average
            if len(energy_trend_data) >= 3:
                fig.add_trace(go.Scatter(
                    x=energy_trend_data['Month'],
                    y=energy_trend_data['Energy_Generated_MWh'].rolling(window=3, min_periods=1).mean(),
                    name="3-Month Moving Average",
                    line=dict(color=DEC_GOLDEN_YELLOW, width=2, dash='dash')
                ))
            
            fig.update_layout(
                title="Monthly Energy Generation Trend",
                xaxis_title="Month",
                yaxis_title="Energy Generated (MWh)",
                hovermode='x unified',
                height=500
            )
            st.plotly_chart(fig, use_container_width=True)
            
            st.markdown(f"""
                <style>
                    /* Custom expander header styling */
                    .streamlit-expanderHeader {{
                        background: linear-gradient(135deg, {DEC_BLUE} 0%, #1e3a6e 100%) !important;
                        color: {DEC_BLUE} !important;
                        font-size: 18px !important;
                        font-weight: 700 !important;
                        padding: 15px 20px !important;
                        border-radius: 10px !important;
                        border-left: 5px solid {DEC_GOLDEN_YELLOW} !important;
                        transition: all 0.3s ease !important;
                    }}
                    
                    .streamlit-expanderHeader:hover {{
                        background: linear-gradient(135deg, {DEC_GOLDEN_YELLOW} 0%, #e6b800 100%) !important;
                        color: {DEC_BLACK} !important;
                        transform: translateX(5px) !important;
                        border-left: 5px solid {DEC_BLUE} !important;
                    }}
                    
                    .streamlit-expanderHeader svg {{
                        fill: {DEC_GOLDEN_YELLOW} !important;
                        width: 20px !important;
                        height: 20px !important;
                    }}
                    
                    .streamlit-expanderHeader:hover svg {{
                        fill: {DEC_BLUE} !important;
                    }}
                    
                    /* Expander content area */
                    .streamlit-expanderContent {{
                        background-color: {DEC_WHITE} !important;
                        border: 1px solid #e0e0e0 !important;
                        border-top: none !important;
                        border-radius: 0 0 10px 10px !important;
                        padding: 20px !important;
                    }}
                </style>
            """, unsafe_allow_html=True)

            # Then use the standard expander
            with st.expander("📊 View Generation Trend Data", expanded=False):
                st.dataframe(energy_trend_data)
                csv = energy_trend_data.to_csv(index=False).encode('utf-8')
                st.download_button(
                        label="📥 Download Trend Data (CSV)",
                        data=csv,
                        file_name=f"energy_generation_trend_{datetime.now().strftime('%Y%m%d')}.csv",
                        mime="text/csv",
                        use_container_width=True,
                        help="Click to download the complete trend data as a CSV file"
                    )
                
                # Optional: Add quick stats row
                st.markdown("---")
                stat_col1, stat_col2, stat_col3, stat_col4 = st.columns(4)
                with stat_col1:
                    st.metric(
                        "📊 Average Generation",
                        f"{energy_trend_data['Energy_Generated_MWh'].mean():,.0f} MWh",
                        delta=None
                    )
                with stat_col2:
                    st.metric(
                        "📈 Max Generation",
                        f"{energy_trend_data['Energy_Generated_MWh'].max():,.0f} MWh",
                        delta=None
                    )
                with stat_col3:
                    st.metric(
                        "📉 Min Generation",
                        f"{energy_trend_data['Energy_Generated_MWh'].min():,.0f} MWh",
                        delta=None
                    )
                with stat_col4:
                    st.metric(
                        "🎯 Total Generation",
                        f"{energy_trend_data['Energy_Generated_MWh'].sum():,.0f} MWh",
                        delta=None
                    )
        
        elif view == "Revenue & Cost Analysis":
            # Dual axis chart for revenue and cost
            # Build aggregation dictionary for revenue data
            revenue_agg = {}
            
            if 'Revenue' in filtered_sales_df.columns:
                revenue_agg['Revenue'] = 'sum'
            elif 'Sales' in filtered_sales_df.columns:
                revenue_agg['Revenue'] = 'sum'
                filtered_sales_df['Revenue'] = filtered_sales_df['Sales']
            
            if 'Operating_Cost' in filtered_sales_df.columns:
                revenue_agg['Operating_Cost'] = 'sum'
            else:
                # Create Operating_Cost column if it doesn't exist
                if 'Sales' in filtered_sales_df.columns:
                    filtered_sales_df['Operating_Cost'] = filtered_sales_df['Sales'] * 0.6
                    revenue_agg['Operating_Cost'] = 'sum'
            
            # Only proceed if we have revenue data
            if revenue_agg:
                monthly_data = filtered_sales_df.groupby(
                    filtered_sales_df["month_year"].dt.strftime("%Y-%m")
                ).agg(revenue_agg).reset_index()
                
                monthly_data.columns = ['month_year'] + list(revenue_agg.keys())
                
                fig = make_subplots(specs=[[{"secondary_y": True}]])
                
                if 'Revenue' in monthly_data.columns:
                    fig.add_trace(
                        go.Scatter(
                            x=monthly_data['month_year'], 
                            y=monthly_data['Revenue'], 
                            name="Revenue", 
                            line=dict(color=DEC_BLUE, width=3)
                        ),
                        secondary_y=False
                    )
                
                if 'Operating_Cost' in monthly_data.columns:
                    fig.add_trace(
                        go.Scatter(
                            x=monthly_data['month_year'], 
                            y=monthly_data['Operating_Cost'], 
                            name="Operating Cost", 
                            line=dict(color='red', width=3)
                        ),
                        secondary_y=True
                    )
                
                fig.update_layout(
                    title="Monthly Revenue vs Operating Cost Trend", 
                    xaxis_title="Month", 
                    hovermode='x unified', 
                    height=500
                )
                fig.update_yaxes(title_text="Revenue ($)", secondary_y=False)
                fig.update_yaxes(title_text="Operating Cost ($)", secondary_y=True)
                st.plotly_chart(fig, use_container_width=True)
        
        elif view == "Efficiency Metrics Trend":
            # Track plant efficiency and load factor over time
            # Build aggregation dictionary for efficiency data
            efficiency_agg = {}
            
            if 'Plant_Efficiency_Percent' in filtered_sales_df.columns:
                efficiency_agg['Plant_Efficiency_Percent'] = 'mean'
            
            if 'Load_Factor_Percent' in filtered_sales_df.columns:
                efficiency_agg['Load_Factor_Percent'] = 'mean'
            
            # Only proceed if we have efficiency columns
            if efficiency_agg:
                efficiency_data = filtered_sales_df.groupby(
                    filtered_sales_df["month_year"].dt.strftime("%Y-%m")
                ).agg(efficiency_agg).reset_index()
                
                efficiency_data.columns = ['month_year'] + list(efficiency_agg.keys())
                
                fig = go.Figure()
                
                if 'Plant_Efficiency_Percent' in efficiency_data.columns:
                    fig.add_trace(go.Scatter(
                        x=efficiency_data['month_year'], 
                        y=efficiency_data['Plant_Efficiency_Percent'],
                        name="Plant Efficiency %", 
                        line=dict(color=DEC_BLUE, width=3)
                    ))
                
                if 'Load_Factor_Percent' in efficiency_data.columns:
                    fig.add_trace(go.Scatter(
                        x=efficiency_data['month_year'], 
                        y=efficiency_data['Load_Factor_Percent'],
                        name="Load Factor %", 
                        line=dict(color=DEC_GOLDEN_YELLOW, width=3)
                    ))
                
                fig.update_layout(
                    title="Plant Efficiency & Load Factor Trends", 
                    xaxis_title="Month", 
                    yaxis_title="Percentage (%)",
                    hovermode='x unified', 
                    height=500
                )
                fig.add_hline(y=85, line_dash="dash", line_color="green", annotation_text="Efficiency Target")
                st.plotly_chart(fig, use_container_width=True)
        
        else:  # Monthly Performance Comparison
            filtered_sales_df["Year"] = filtered_sales_df[date_col].dt.year
            filtered_sales_df["Month"] = filtered_sales_df[date_col].dt.strftime("%B")
            month_order = ["January", "February", "March", "April", "May", "June",
                          "July", "August", "September", "October", "November", "December"]
            filtered_sales_df["Month"] = pd.Categorical(filtered_sales_df["Month"], categories=month_order, ordered=True)
            
            if 'Energy_Generated_MWh' in filtered_sales_df.columns:
                comparison_chart = filtered_sales_df.groupby(["Year", "Month"])["Energy_Generated_MWh"].sum().reset_index()
            else:
                comparison_chart = filtered_sales_df.groupby(["Year", "Month"])["Sales"].sum().reset_index()
            
            fig = px.line(comparison_chart, x="Month", y=comparison_chart.columns[2], color="Year",
                         title="Monthly Generation Comparison by Year",
                         markers=True, height=500)
            st.plotly_chart(fig, use_container_width=True)
    
    st.markdown("---")
    
    # ============ PLANT PERFORMANCE HIERARCHY ============
    st.subheader("🏭 Generation Performance by Plant")
    
    if 'Plant_Name' in filtered_sales_df.columns:
        values_col = 'Energy_Generated_MWh' if 'Energy_Generated_MWh' in filtered_sales_df.columns else 'Sales'
        color_col = 'Plant_Efficiency_Percent' if 'Plant_Efficiency_Percent' in filtered_sales_df.columns else None
        
        fig = px.treemap(filtered_sales_df, path=["Plant_Name", "Unit_Type"], 
                        values=values_col,
                        color=color_col,
                        color_continuous_scale='RdYlGn',
                        title="Energy Generation Distribution by Plant and Unit Type")
        fig.update_layout(height=500)
        st.plotly_chart(fig, use_container_width=True)
    
    # ============ REGIONAL DEMAND ANALYSIS ============
    st.subheader("📍 Regional Demand Analysis")
    region_col1, region_col2 = st.columns(2)
    
    with region_col1:
        if 'Region' in filtered_sales_df.columns:
            if 'Energy_Sold_MWh' in filtered_sales_df.columns:
                region_demand = filtered_sales_df.groupby('Region')['Energy_Sold_MWh'].sum().reset_index()
            else:
                region_demand = filtered_sales_df.groupby('Region')['Sales'].sum().reset_index()
            
            fig = px.bar(region_demand, x='Region', y=region_demand.columns[1], 
                        title="Energy Demand by Region",
                        color=region_demand.columns[1],
                        color_continuous_scale='Viridis')
            st.plotly_chart(fig, use_container_width=True)
    
    with region_col2:
        if 'Customer_Type' in filtered_sales_df.columns:
            if 'Energy_Sold_MWh' in filtered_sales_df.columns:
                customer_demand = filtered_sales_df.groupby('Customer_Type')['Energy_Sold_MWh'].sum().reset_index()
            else:
                customer_demand = filtered_sales_df.groupby('Customer_Type')['Sales'].sum().reset_index()
            
            fig = px.pie(customer_demand, values=customer_demand.columns[1], names='Customer_Type', 
                        title="Demand by Customer Type", hole=0.3)
            fig.update_traces(textposition='inside', textinfo='percent+label')
            st.plotly_chart(fig, use_container_width=True)
    
    # ============ SCATTER PLOT: Efficiency vs Generation ============
    if 'Plant_Efficiency_Percent' in filtered_sales_df.columns and 'Energy_Generated_MWh' in filtered_sales_df.columns:
        st.subheader("📈 Efficiency vs Generation Analysis")
        size_col = 'Load_Factor_Percent' if 'Load_Factor_Percent' in filtered_sales_df.columns else None
        color_col = 'Plant_Name' if 'Plant_Name' in filtered_sales_df.columns else None
        hover_cols = ['Unit_Type'] if 'Unit_Type' in filtered_sales_df.columns else None
        
        fig = px.scatter(filtered_sales_df, x="Energy_Generated_MWh", y="Plant_Efficiency_Percent",
                        size=size_col,
                        color=color_col,
                        hover_data=hover_cols,
                        title="Plant Efficiency vs Energy Generation")
        fig.update_layout(height=500)
        st.plotly_chart(fig, use_container_width=True)
    
    # ============ PERFORMANCE SUMMARY TABLE ============
    st.subheader("📋 Plant Performance Summary")
    
    if 'Plant_Name' in filtered_sales_df.columns:
        # Build aggregation dictionary dynamically
        agg_dict = {}
        
        if 'Energy_Generated_MWh' in filtered_sales_df.columns:
            agg_dict['Energy_Generated_MWh'] = 'sum'
        elif 'Sales' in filtered_sales_df.columns:
            filtered_sales_df['Energy_Generated_MWh'] = filtered_sales_df['Sales']
            agg_dict['Energy_Generated_MWh'] = 'sum'
        
        if 'Plant_Efficiency_Percent' in filtered_sales_df.columns:
            agg_dict['Plant_Efficiency_Percent'] = 'mean'
        elif 'Load_Factor_Percent' in filtered_sales_df.columns:
            agg_dict['Plant_Efficiency_Percent'] = 'mean'
            filtered_sales_df['Plant_Efficiency_Percent'] = filtered_sales_df['Load_Factor_Percent']
        
        if 'Availability_Percent' in filtered_sales_df.columns:
            agg_dict['Availability_Percent'] = 'mean'
        
        if 'Revenue' in filtered_sales_df.columns:
            agg_dict['Revenue'] = 'sum'
        elif 'Sales' in filtered_sales_df.columns:
            filtered_sales_df['Revenue'] = filtered_sales_df['Sales']
            agg_dict['Revenue'] = 'sum'
        
        # Only create performance_df if we have columns to aggregate
        if agg_dict:
            performance_df = filtered_sales_df.groupby('Plant_Name').agg(agg_dict).round(2).reset_index()
            
            # Rename columns for display
            column_mapping = {
                'Energy_Generated_MWh': 'Energy Generated (MWh)',
                'Plant_Efficiency_Percent': 'Efficiency (%)',
                'Availability_Percent': 'Availability (%)',
                'Revenue': 'Revenue ($)'
            }
            
            # Only rename columns that exist
            for old_name, new_name in column_mapping.items():
                if old_name in performance_df.columns:
                    performance_df = performance_df.rename(columns={old_name: new_name})
            
            # Format the dataframe
            styled_df = performance_df.style
            if 'Energy Generated (MWh)' in performance_df.columns:
                styled_df = styled_df.format({'Energy Generated (MWh)': '{:,.0f}'})
            if 'Efficiency (%)' in performance_df.columns:
                styled_df = styled_df.format({'Efficiency (%)': '{:.1f}%'})
            if 'Availability (%)' in performance_df.columns:
                styled_df = styled_df.format({'Availability (%)': '{:.1f}%'})
            if 'Revenue ($)' in performance_df.columns:
                styled_df = styled_df.format({'Revenue ($)': '${:,.2f}'})
            
            if 'Energy Generated (MWh)' in performance_df.columns:
                styled_df = styled_df.background_gradient(cmap='YlOrRd', subset=['Energy Generated (MWh)'])
            
            st.dataframe(styled_df, use_container_width=True)
            
            csv_performance = performance_df.to_csv(index=False).encode('utf-8')
            st.download_button("📥 Download Plant Performance Report", data=csv_performance, 
                            file_name=f"plant_performance_{today.replace(' ', '_')}.csv", 
                            mime="text/csv")
    
    st.markdown("---")
    st.caption("© 2024 Muyamuri/Sezani Assistant - ZETDC Power Generation Dashboard | Powered by Decision Edge Consultant | Data refreshed in real-time")

def generate_power_company_test_data():
    """Generate test data for a power generation company like ZETDC"""
    
    np.random.seed(42)
    
    # Date range for 2 years
    dates = pd.date_range(start='2023-01-01', end='2024-12-31', freq='D')
    
    # Power plants
    plants = ['Hwange Thermal', 'Kariba Hydro', 'Munyati Thermal', 'Bulawayo Thermal', 
              'Harare Thermal', 'Gairezi Hydro', 'Solar Plant']
    
    # Plant types
    plant_types = {
        'Hwange Thermal': 'Coal',
        'Kariba Hydro': 'Hydroelectric',
        'Munyati Thermal': 'Coal',
        'Bulawayo Thermal': 'Coal',
        'Harare Thermal': 'Coal',
        'Gairezi Hydro': 'Hydroelectric',
        'Solar Plant': 'Solar'
    }
    
    # Regions
    regions = ['Harare', 'Bulawayo', 'Manicaland', 'Mashonaland West', 
               'Mashonaland East', 'Midlands', 'Masvingo', 'Matabeleland North', 'Matabeleland South']
    
    # Customer types
    customer_types = ['Residential', 'Commercial', 'Industrial', 'Mining', 'Agricultural', 'Government']
    
    # Generate data
    data = []
    
    for date in dates:
        for plant in plants:
            # Seasonal variation
            month = date.month
            if plant in ['Kariba Hydro', 'Gairezi Hydro']:
                # Hydro plants perform better in rainy season (Nov-Mar)
                season_factor = 1.2 if month in [11, 12, 1, 2, 3] else 0.9
            elif plant == 'Solar Plant':
                # Solar performs better in dry season (Apr-Oct)
                season_factor = 1.15 if month in [4, 5, 6, 7, 8, 9, 10] else 0.85
            else:
                # Thermal plants: lower efficiency in hot months due to cooling issues
                season_factor = 0.95 if month in [10, 11, 12, 1, 2, 3] else 1.05
            
            # Base generation capacity (MWh)
            base_capacity = {
                'Hwange Thermal': 920,
                'Kariba Hydro': 1050,
                'Munyati Thermal': 120,
                'Bulawayo Thermal': 90,
                'Harare Thermal': 75,
                'Gairezi Hydro': 30,
                'Solar Plant': 25
            }[plant]
            
            # Add random variation and maintenance effects
            maintenance_factor = np.random.uniform(0.85, 1.0) if np.random.random() < 0.1 else 1.0
            energy_generated = base_capacity * season_factor * maintenance_factor * np.random.uniform(0.7, 1.0)
            
            # Plant efficiency (%) - varies by plant type and load
            if plant in ['Kariba Hydro', 'Gairezi Hydro']:
                efficiency = np.random.uniform(88, 94)
            elif plant == 'Solar Plant':
                efficiency = np.random.uniform(18, 22) if month in [4,5,6,7,8,9,10] else np.random.uniform(15, 19)
            else:
                efficiency = np.random.uniform(32, 38)
            
            # Load factor (%)
            load_factor = np.random.uniform(65, 85)
            
            # Availability (%)
            availability = np.random.uniform(85, 98)
            
            # Energy sold (MWh) - after transmission losses
            system_loss = np.random.uniform(8, 15)
            energy_sold = energy_generated * (1 - system_loss/100)
            
            # Revenue ($) - different rates for different customer types
            avg_rate = 0.12  # $ per kWh = $120 per MWh
            revenue = energy_sold * avg_rate * 1000  # Convert to $
            
            # Operating cost ($)
            operating_cost = energy_generated * 45 * (1 if plant in ['Kariba Hydro', 'Gairezi Hydro'] else 1.3)
            
            # Budget generation (MWh) - 5% higher than actual with some variation
            budget_generation = energy_generated * np.random.uniform(1.02, 1.08)
            
            # Outage hours
            outage_hours = np.random.exponential(2) if np.random.random() < 0.3 else 0
            
            # Distribute to regions and customers
            for region in np.random.choice(regions, size=np.random.randint(1, 4), replace=False):
                for customer_type in np.random.choice(customer_types, size=np.random.randint(1, 4), replace=False):
                    # Allocate energy to this region/customer combination
                    allocation = np.random.uniform(0.1, 0.4)
                    
                    data.append({
                        'Date': date,
                        'Plant_Name': plant,
                        'Plant_Type': plant_types[plant],
                        'Unit_Type': f"Unit {np.random.randint(1, 5)}",
                        'Region': region,
                        'Customer_Type': customer_type,
                        'Energy_Generated_MWh': energy_generated * allocation,
                        'Energy_Sold_MWh': energy_sold * allocation,
                        'Plant_Efficiency_Percent': efficiency,
                        'Load_Factor_Percent': load_factor,
                        'Availability_Percent': availability,
                        'System_Loss_Percent': system_loss,
                        'Revenue': revenue * allocation,
                        'Operating_Cost': operating_cost * allocation,
                        'Budget_Generation_MWh': budget_generation * allocation,
                        'Outage_Hours': outage_hours,
                        'Maintenance_Flag': 1 if maintenance_factor < 0.95 else 0
                    })
    
    df = pd.DataFrame(data)
    
    # Add some summary statistics
    print(f"Generated {len(df):,} records")
    print(f"Date range: {df['Date'].min()} to {df['Date'].max()}")
    print(f"Total Energy Generated: {df['Energy_Generated_MWh'].sum():,.0f} MWh")
    print(f"Total Revenue: ${df['Revenue'].sum():,.2f}")
    
    return df

def save_power_test_data_to_database(df, conn_str):
    """Save generated power test data to SQL Server database"""
    try:
        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()
        
        # Create table if not exists
        cursor.execute("""
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='PowerGeneration' AND xtype='U')
            CREATE TABLE PowerGeneration (
                Date DATE,
                Plant_Name NVARCHAR(100),
                Plant_Type NVARCHAR(50),
                Unit_Type NVARCHAR(50),
                Region NVARCHAR(100),
                Customer_Type NVARCHAR(50),
                Energy_Generated_MWh FLOAT,
                Energy_Sold_MWh FLOAT,
                Plant_Efficiency_Percent FLOAT,
                Load_Factor_Percent FLOAT,
                Availability_Percent FLOAT,
                System_Loss_Percent FLOAT,
                Revenue FLOAT,
                Operating_Cost FLOAT,
                Budget_Generation_MWh FLOAT,
                Outage_Hours FLOAT,
                Maintenance_Flag INT
            )
        """)
        conn.commit()
        
        # Insert data in batches
        batch_size = 1000
        for i in range(0, len(df), batch_size):
            batch = df.iloc[i:i+batch_size]
            for _, row in batch.iterrows():
                cursor.execute("""
                    INSERT INTO PowerGeneration VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                """, tuple(row))
            conn.commit()
            print(f"Inserted {i+batch_size} records...")
        
        cursor.close()
        conn.close()
        print("Power data saved successfully to database!")
        return True
        
    except Exception as e:
        print(f"Error saving to database: {e}")
        return False

@st.cache_data(ttl=300)
def load_power_data_from_db(conn_str, start_date=None, end_date=None):
    """Load power generation data from SQL Server database"""
    try:
        conn = pyodbc.connect(conn_str)
        
        query = """
            SELECT 
                Date as Order_Date,
                Plant_Name,
                Plant_Type,
                Unit_Type,
                Region,
                Customer_Type,
                Energy_Generated_MWh,
                Energy_Sold_MWh,
                Plant_Efficiency_Percent,
                Load_Factor_Percent,
                Availability_Percent,
                System_Loss_Percent,
                Revenue,
                Operating_Cost,
                Budget_Generation_MWh,
                Outage_Hours,
                Maintenance_Flag
            FROM PowerGeneration
            WHERE 1=1
        """
        
        params = []
        if start_date:
            query += " AND Date >= ?"
            params.append(start_date)
        if end_date:
            query += " AND Date <= ?"
            params.append(end_date)
        query += " ORDER BY Date"
        
        df = pd.read_sql(query, conn, params=params)
        conn.close()
        return df
    except Exception as e:
        st.error(f"Error loading power data from database: {e}")
        return pd.DataFrame()

# ============================================
# BANKING DATA GENERATION FUNCTIONS
# ============================================

def generate_banking_test_data():
    """Generate comprehensive test data for a commercial bank"""
    np.random.seed(42)
    
    # Date range for 2 years
    dates = pd.date_range(start='2023-01-01', end='2024-12-31', freq='D')
    
    # Bank branches
    branches = ['Harare Main', 'Bulawayo Central', 'Mutare Branch', 'Gweru Branch', 
                'Masvingo Branch', 'Marondera Branch', 'Chinhoyi Branch', 'Victoria Falls Branch']
    
    # Regions
    regions = ['Harare', 'Bulawayo', 'Manicaland', 'Midlands', 'Mashonaland West', 
               'Mashonaland East', 'Masvingo', 'Matabeleland North', 'Matabeleland South']
    
    # Product categories
    product_categories = ['Retail Banking', 'Corporate Banking', 'SME Banking', 'Treasury', 'Investment Banking']
    
    # Specific products
    products = {
        'Retail Banking': ['Current Account', 'Savings Account', 'Fixed Deposit', 'Personal Loan', 'Credit Card', 'Mortgage'],
        'Corporate Banking': ['Corporate Loans', 'Trade Finance', 'Cash Management', 'Project Finance', 'Working Capital'],
        'SME Banking': ['Business Account', 'SME Loan', 'Equipment Finance', 'Business Overdraft'],
        'Treasury': ['Forex Trading', 'Money Market', 'Government Securities', 'Derivatives'],
        'Investment Banking': ['Advisory Services', 'Bond Issuance', 'Equity Capital Markets', 'Asset Management']
    }
    
    # Customer segments
    customer_segments = ['Mass Market', 'Affluent', 'High Net Worth', 'Corporate', 'Institutional']
    
    # Generate data
    data = []
    
    for date in dates:
        month = date.month
        quarter = (month - 1) // 3 + 1
        
        for branch in branches:
            region = np.random.choice(regions)
            
            for category in product_categories:
                for product in products.get(category, [category]):
                    # Seasonal and cyclical patterns
                    if category in ['Retail Banking', 'SME Banking']:
                        seasonal_factor = 1.3 if month == 12 else 1.1 if month == 1 else 1.0
                    elif category == 'Treasury':
                        seasonal_factor = 1.2 if month in [3, 6, 9, 12] else 1.0
                    else:
                        seasonal_factor = 1.0
                    
                    # Growth trend (monthly growth of 0.5%)
                    growth_trend = 1 + (date - dates[0]).days / 365 * 0.06
                    
                    # Base values
                    if category == 'Retail Banking':
                        num_customers = int(np.random.uniform(500, 5000) * seasonal_factor * growth_trend)
                        avg_balance = np.random.uniform(1000, 50000) * seasonal_factor
                        total_balance = num_customers * avg_balance
                        revenue = total_balance * np.random.uniform(0.02, 0.05)
                    elif category == 'Corporate Banking':
                        num_customers = int(np.random.uniform(10, 200) * growth_trend)
                        avg_balance = np.random.uniform(500000, 10000000) * seasonal_factor
                        total_balance = num_customers * avg_balance
                        revenue = total_balance * np.random.uniform(0.01, 0.03)
                    elif category == 'SME Banking':
                        num_customers = int(np.random.uniform(100, 1000) * growth_trend)
                        avg_balance = np.random.uniform(50000, 500000) * seasonal_factor
                        total_balance = num_customers * avg_balance
                        revenue = total_balance * np.random.uniform(0.015, 0.04)
                    else:  # Treasury and Investment Banking
                        num_customers = int(np.random.uniform(5, 50) * growth_trend)
                        avg_balance = np.random.uniform(1000000, 50000000) * seasonal_factor
                        total_balance = num_customers * avg_balance
                        revenue = total_balance * np.random.uniform(0.005, 0.02)
                    
                    # Risk metrics
                    npl_ratio = np.random.uniform(0.01, 0.08) * (1.5 if category in ['SME Banking', 'Retail Banking'] else 1.0)
                    provision_coverage = np.random.uniform(60, 90)
                    
                    # Operational metrics
                    transaction_volume = int(num_customers * np.random.uniform(5, 20))
                    digital_adoption = np.random.uniform(30, 85) if category in ['Retail Banking', 'SME Banking'] else np.random.uniform(50, 95)
                    customer_satisfaction = np.random.uniform(3.5, 4.8)
                    
                    # Cost metrics
                    operating_cost = revenue * np.random.uniform(0.4, 0.7)
                    cost_to_income = (operating_cost / revenue * 100) if revenue > 0 else 0
                    
                    # Capital adequacy
                    capital_adequacy_ratio = np.random.uniform(12, 25)
                    liquidity_ratio = np.random.uniform(20, 45)
                    
                    data.append({
                        'Date': date,
                        'Branch': branch,
                        'Region': region,
                        'Product_Category': category,
                        'Product': product,
                        'Customer_Segment': np.random.choice(customer_segments),
                        'Num_Customers': num_customers,
                        'Total_Balance': total_balance,
                        'Revenue': revenue,
                        'Operating_Cost': operating_cost,
                        'Cost_to_Income_Ratio': cost_to_income,
                        'NPL_Ratio': npl_ratio * 100,
                        'Provision_Coverage': provision_coverage,
                        'Transaction_Volume': transaction_volume,
                        'Digital_Adoption_Pct': digital_adoption,
                        'Customer_Satisfaction': customer_satisfaction,
                        'Capital_Adequacy_Ratio': capital_adequacy_ratio,
                        'Liquidity_Ratio': liquidity_ratio,
                        'Month': month,
                        'Quarter': quarter,
                        'Year': date.year
                    })
    
    df = pd.DataFrame(data)
    print(f"Generated {len(df):,} banking records")
    print(f"Date range: {df['Date'].min()} to {df['Date'].max()}")
    print(f"Total Revenue: ${df['Revenue'].sum():,.2f}")
    print(f"Total Balance: ${df['Total_Balance'].sum():,.2f}")
    
    return df

def save_banking_data_to_database(df, conn_str):
    """Save generated banking data to SQL Server database"""
    try:
        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()
        
        # Create table if not exists
        cursor.execute("""
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='BankingTransactions' AND xtype='U')
            CREATE TABLE BankingTransactions (
                Date DATE,
                Branch NVARCHAR(100),
                Region NVARCHAR(100),
                Product_Category NVARCHAR(100),
                Product NVARCHAR(100),
                Customer_Segment NVARCHAR(100),
                Num_Customers INT,
                Total_Balance FLOAT,
                Revenue FLOAT,
                Operating_Cost FLOAT,
                Cost_to_Income_Ratio FLOAT,
                NPL_Ratio FLOAT,
                Provision_Coverage FLOAT,
                Transaction_Volume INT,
                Digital_Adoption_Pct FLOAT,
                Customer_Satisfaction FLOAT,
                Capital_Adequacy_Ratio FLOAT,
                Liquidity_Ratio FLOAT,
                Month INT,
                Quarter INT,
                Year INT
            )
        """)
        conn.commit()
        
        # Insert data in batches
        batch_size = 1000
        for i in range(0, len(df), batch_size):
            batch = df.iloc[i:i+batch_size]
            for _, row in batch.iterrows():
                cursor.execute("""
                    INSERT INTO BankingTransactions VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                """, tuple(row))
            conn.commit()
            print(f"Inserted {i+batch_size} records...")
        
        cursor.close()
        conn.close()
        print("Banking data saved successfully to database!")
        
    except Exception as e:
        print(f"Error saving to database: {e}")

def save_banking_data_to_flat_file(df, filepath="banking_data.csv"):
    """Save banking data to CSV flat file"""
    try:
        df.to_csv(filepath, index=False)
        print(f"Banking data saved to {filepath}")
        return True
    except Exception as e:
        print(f"Error saving to flat file: {e}")
        return False

def load_banking_data_from_flat_file(filepath="banking_data.csv"):
    """Load banking data from CSV flat file"""
    try:
        if os.path.exists(filepath):
            df = pd.read_csv(filepath)
            df['Date'] = pd.to_datetime(df['Date'])
            return df
        else:
            return None
    except Exception as e:
        print(f"Error loading from flat file: {e}")
        return None

@st.cache_data(ttl=300)
def load_banking_data_from_db(conn_str, start_date=None, end_date=None):
    """Load banking data from SQL Server database"""
    try:
        conn = pyodbc.connect(conn_str)
        
        query = """
            SELECT 
                Date,
                Branch,
                Region,
                Product_Category,
                Product,
                Customer_Segment,
                Num_Customers,
                Total_Balance,
                Revenue,
                Operating_Cost,
                Cost_to_Income_Ratio,
                NPL_Ratio,
                Provision_Coverage,
                Transaction_Volume,
                Digital_Adoption_Pct,
                Customer_Satisfaction,
                Capital_Adequacy_Ratio,
                Liquidity_Ratio,
                Month,
                Quarter,
                Year
            FROM BankingTransactions
            WHERE 1=1
        """
        
        params = []
        if start_date:
            query += " AND Date >= ?"
            params.append(start_date)
        if end_date:
            query += " AND Date <= ?"
            params.append(end_date)
            
        query += " ORDER BY Date"
        
        df = pd.read_sql(query, conn, params=params)
        conn.close()
        
        return df
    except Exception as e:
        st.error(f"Error loading banking data from database: {e}")
        return pd.DataFrame()

# ============================================
# BANKING BI DASHBOARD
# ============================================

def render_banking_bi_dashboard(filtered_df, full_df, today):
    """
    Render comprehensive Banking BI dashboard with KPIs, risk metrics, and visualizations
    """
    
    # Header with logo
    col1, col2 = st.columns([1, 3])
    with col1:
        base64_img = get_base64_image("./images/DecisionEdgeLogo.png")
        st.markdown(f"""
            <div style="text-align: left;">
                <img src="data:image/png;base64,{base64_img}" style="width:80%;">
            </div>
        """, unsafe_allow_html=True)
    
    with col2:
        st.title("🏦 Muyamuri/Sezani Assistant - Commercial Banking BI Dashboard")
        st.markdown(f"### Executive Performance Report as at {today}")
        st.markdown("""
            <style>
                .custom-subtitle {
                    text-align: left;
                    color: #FECC0D;
                    font-size: 16px;
                    font-weight: 500;
                    font-style: italic;
                    margin: 5px 0 15px 0;
                    padding: 5px;
                    letter-spacing: 0.5px;
                    background: linear-gradient(90deg, transparent, rgba(254, 204, 13, 0.1), transparent);
                }
            </style>
            <div class="custom-subtitle">
                *For decision making and risk management*
            </div>
        """, unsafe_allow_html=True)
    
    st.markdown("---")
    
    # Check if dataframe is empty
    if filtered_df.empty:
        st.warning("⚠️ No banking data available. Please generate sample data using the 'Generate Sample Banking Data' option in the sidebar.")
        return
    
    # Calculate key metrics using safe_kpi_calculation
    try:
        # Core Financial KPIs
        total_revenue = safe_kpi_calculation(filtered_df['Revenue'].sum())
        total_balance = safe_kpi_calculation(filtered_df['Total_Balance'].sum())
        total_operating_cost = safe_kpi_calculation(filtered_df['Operating_Cost'].sum())
        total_customers = safe_kpi_calculation(filtered_df['Num_Customers'].sum())
        
        # Calculate derived metrics
        profit_before_tax = total_revenue - total_operating_cost
        profit_margin = (profit_before_tax / total_revenue * 100) if total_revenue > 0 else 0
        
        # Handle empty series for mean calculations
        if not filtered_df['Cost_to_Income_Ratio'].empty:
            avg_cost_to_income = safe_kpi_calculation(filtered_df['Cost_to_Income_Ratio'].mean())
        else:
            avg_cost_to_income = 0
            
        if not filtered_df['NPL_Ratio'].empty:
            avg_npl_ratio = safe_kpi_calculation(filtered_df['NPL_Ratio'].mean())
        else:
            avg_npl_ratio = 0
            
        if not filtered_df['Capital_Adequacy_Ratio'].empty:
            avg_capital_adequacy = safe_kpi_calculation(filtered_df['Capital_Adequacy_Ratio'].mean())
        else:
            avg_capital_adequacy = 0
            
        if not filtered_df['Liquidity_Ratio'].empty:
            avg_liquidity_ratio = safe_kpi_calculation(filtered_df['Liquidity_Ratio'].mean())
        else:
            avg_liquidity_ratio = 0
            
        if not filtered_df['Digital_Adoption_Pct'].empty:
            avg_digital_adoption = safe_kpi_calculation(filtered_df['Digital_Adoption_Pct'].mean())
        else:
            avg_digital_adoption = 0
            
        if not filtered_df['Customer_Satisfaction'].empty:
            avg_customer_satisfaction = safe_kpi_calculation(filtered_df['Customer_Satisfaction'].mean())
        else:
            avg_customer_satisfaction = 0
            
        if not filtered_df['Provision_Coverage'].empty:
            avg_provision_coverage = safe_kpi_calculation(filtered_df['Provision_Coverage'].mean())
        else:
            avg_provision_coverage = 0
            
        if not filtered_df['Transaction_Volume'].empty:
            total_transactions = safe_kpi_calculation(filtered_df['Transaction_Volume'].sum())
        else:
            total_transactions = 0
        
        # Calculate period-over-period changes
        if not filtered_df.empty:
            current_quarter = filtered_df['Quarter'].max()
            current_year = filtered_df['Year'].max()
            
            current_q_data = filtered_df[(filtered_df['Quarter'] == current_quarter) & (filtered_df['Year'] == current_year)]
            prev_q_data = filtered_df[(filtered_df['Quarter'] == current_quarter - 1) & (filtered_df['Year'] == current_year)]
            if prev_q_data.empty and current_year > 2023:
                prev_q_data = filtered_df[(filtered_df['Quarter'] == 4) & (filtered_df['Year'] == current_year - 1)]
            
            current_revenue = safe_kpi_calculation(current_q_data['Revenue'].sum())
            prev_revenue = safe_kpi_calculation(prev_q_data['Revenue'].sum())
            revenue_growth = ((current_revenue - prev_revenue) / prev_revenue * 100) if prev_revenue > 0 else 0
        else:
            revenue_growth = 0
        
    except Exception as e:
        st.warning(f"Some KPI data unavailable: {e}")
        total_revenue = total_balance = total_operating_cost = total_customers = 0
        profit_before_tax = profit_margin = avg_cost_to_income = avg_npl_ratio = 0
        avg_capital_adequacy = avg_liquidity_ratio = avg_digital_adoption = avg_customer_satisfaction = 0
        avg_provision_coverage = total_transactions = 0
        revenue_growth = 0
    
    # ============ MAIN KPIs ROW 1 - Financial Performance ============
    st.subheader("💰 Financial Performance Dashboard")
    
    kpi_col1, kpi_col2, kpi_col3, kpi_col4 = st.columns(4)
    
    with kpi_col1:
        st.markdown('<p class="kpi-label">💵 Total Revenue</p>', unsafe_allow_html=True)
        st.metric("", f"${total_revenue/1e6:,.2f}M" if total_revenue > 1e6 else f"${total_revenue:,.0f}", 
                 delta=f"{revenue_growth:+.1f}% QoQ" if revenue_growth != 0 else None)
    with kpi_col2:
        st.markdown('<p class="kpi-label">📊 Total Balance Sheet</p>', unsafe_allow_html=True)
        st.metric("", f"${total_balance/1e6:,.2f}M" if total_balance > 1e6 else f"${total_balance:,.0f}", delta=None)
    with kpi_col3:
        st.markdown('<p class="kpi-label">📈 Profit Before Tax</p>', unsafe_allow_html=True)
        st.metric("", f"${profit_before_tax/1e6:,.2f}M" if profit_before_tax > 1e6 else f"${profit_before_tax:,.0f}", 
                 delta=f"Margin: {profit_margin:.1f}%")
    with kpi_col4:
        st.markdown('<p class="kpi-label">👥 Total Customers</p>', unsafe_allow_html=True)
        st.metric("", f"{total_customers:,.0f}", delta=None)
    
    st.markdown("---")
    
    # ============ KPIs ROW 2 - Operational Efficiency ============
    st.subheader("⚙️ Operational & Efficiency Metrics")
    
    op_col1, op_col2, op_col3, op_col4 = st.columns(4)
    
    with op_col1:
        st.markdown('<p class="kpi-label">📉 Cost-to-Income Ratio</p>', unsafe_allow_html=True)
        st.metric("", f"{avg_cost_to_income:.1f}%", 
                 delta="Target: <60%", delta_color="inverse" if avg_cost_to_income > 60 else "normal")
    with op_col2:
        st.markdown('<p class="kpi-label">🏦 Capital Adequacy Ratio</p>', unsafe_allow_html=True)
        st.metric("", f"{avg_capital_adequacy:.1f}%", 
                 delta="Regulatory: 12%", delta_color="normal" if avg_capital_adequacy >= 12 else "inverse")
    with op_col3:
        st.markdown('<p class="kpi-label">💧 Liquidity Ratio</p>', unsafe_allow_html=True)
        st.metric("", f"{avg_liquidity_ratio:.1f}%", 
                 delta="Target: >25%", delta_color="normal" if avg_liquidity_ratio >= 25 else "inverse")
    with op_col4:
        st.markdown('<p class="kpi-label">📱 Digital Adoption</p>', unsafe_allow_html=True)
        st.metric("", f"{avg_digital_adoption:.1f}%", 
                 delta=f"Target: 70%", delta_color="normal" if avg_digital_adoption >= 70 else "inverse")
    
    st.markdown("---")
    
    # ============ KPIs ROW 3 - Risk & Customer Metrics ============
    st.subheader("⚠️ Risk Management & Customer Experience")
    
    risk_col1, risk_col2, risk_col3, risk_col4 = st.columns(4)
    
    npl_risk_class = "risk-low" if avg_npl_ratio < 3 else "risk-medium" if avg_npl_ratio < 8 else "risk-high"
    npl_risk_text = "Low Risk" if avg_npl_ratio < 3 else "Medium Risk" if avg_npl_ratio < 8 else "High Risk"
    
    with risk_col1:
        st.markdown('<p class="kpi-label">📉 NPL Ratio</p>', unsafe_allow_html=True)
        st.metric("", f"{avg_npl_ratio:.1f}%", delta=npl_risk_text, delta_color="inverse" if avg_npl_ratio > 5 else "normal")
        st.markdown(f"<p class='{npl_risk_class}'>Industry benchmark: 3-5%</p>", unsafe_allow_html=True)
    
    with risk_col2:
        st.markdown('<p class="kpi-label">🛡️ Provision Coverage</p>', unsafe_allow_html=True)
        st.metric("", f"{avg_provision_coverage:.1f}%", delta=None)
    with risk_col3:
        satisfaction_color = "🟢" if avg_customer_satisfaction >= 4.2 else "🟡" if avg_customer_satisfaction >= 3.5 else "🔴"
        st.markdown('<p class="kpi-label">⭐ Customer Satisfaction</p>', unsafe_allow_html=True)
        st.metric("", f"{avg_customer_satisfaction:.1f} / 5.0", delta=satisfaction_color)
    with risk_col4:
        st.markdown('<p class="kpi-label">📊 Transaction Volume</p>', unsafe_allow_html=True)
        st.metric("", f"{total_transactions:,.0f}", delta=None)
    
    st.markdown("---")
    
    # ============ REVENUE TREND ANALYSIS ============
    st.subheader("📈 Revenue & Growth Trends")
    
    if 'Date' in filtered_df.columns:
        filtered_df['Date'] = pd.to_datetime(filtered_df['Date'])
        filtered_df['Month_Year'] = filtered_df['Date'].dt.to_period("M").dt.strftime("%Y-%m")
        
        st.markdown(f"""
            <style>
                /* Radio button container with Decision Edge styling */
                .stRadio > div {{
                    background: linear-gradient(135deg, {DEC_BLUE} 0%, #e9ecef 100%);
                    padding: 15px 20px;
                    border-radius: 12px;
                    border: 1px solid #dee2e6;
                    margin: 15px 0;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                }}
                
                /* Individual radio option labels */
                .stRadio label {{
                    font-size: 14px !important;
                    font-weight: 600 !important;
                    color: {DEC_BLACK} !important;
                    background-color: {DEC_GOLDEN_YELLOW} !important;
                    padding: 10px 20px !important;
                    border-radius: 30px !important;
                    margin: 0 6px !important;
                    border: 2px solid {DEC_BLUE} !important;
                    transition: all 0.3s ease !important;
                    cursor: pointer !important;
                    font-family: 'Segoe UI', 'Roboto', sans-serif !important;
                    letter-spacing: 0.3px;
                }}
                
                /* Hover state */
                .stRadio label:hover {{
                    background-color: {DEC_GOLDEN_YELLOW} !important;
                    border-color: {DEC_GOLDEN_YELLOW} !important;
                    color: {DEC_BLACK} !important;
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                }}
                
                /* Selected/Active state */
                .stRadio label[data-baseweb="radio"]:has(input:checked) {{
                    background-color: {DEC_BLUE} !important;
                    border-color: {DEC_BLUE} !important;
                    color: {DEC_WHITE} !important;
                    box-shadow: 0 2px 8px rgba(40, 58, 142, 0.3);
                }}
                
                /* Radio button circle customization */
                .stRadio input[type="radio"] {{
                    accent-color: {DEC_GOLDEN_YELLOW} !important;
                    width: 15px !important;
                    height: 15px !important;
                    margin-right: 8px !important;
                }}
                
                /* Ensure text contrast in all states */
                .stRadio label span {{
                    color: inherit !important;
                    font-weight: 600 !important;
                }}
                
                /* Icons for each option */
                .stRadio label:first-child {{
                    content: "📈";
                }}
                
                /* Horizontal layout */
                .stRadio > div {{
                    display: flex !important;
                    flex-direction: row !important;
                    gap: 10px !important;
                    flex-wrap: wrap !important;
                    justify-content: center !important;
                }}
                
                /* Remove extra spacing */
                .stRadio > div > label {{
                    margin: 0 !important;
                    flex: 0 1 auto;
                }}
                
                /* Section header styling */
                .analysis-header {{
                    font-size: 18px;
                    font-weight: 700;
                    color: {DEC_BLUE};
                    margin-bottom: 10px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }}
            </style>
            
            <div class="analysis-header">
                <span>📊</span>
                <span>Select Analysis View:</span>
            </div>
        """, unsafe_allow_html=True)

        # Radio button with proper contrast
        trend_view = st.radio(
            "",  # Empty label since we added custom header
            ["Revenue Trend", "Product Performance", "Branch Performance", "Regional Analysis"],
            index=0,
            horizontal=True,
            key="trend_analysis_enhanced",
            label_visibility="collapsed"  # Hide the default label since we added custom one
        )
        
        if trend_view == "Revenue Trend":
            monthly_revenue = filtered_df.groupby('Month_Year')['Revenue'].sum().reset_index()
            
            fig = go.Figure()
            fig.add_trace(go.Scatter(
                x=monthly_revenue['Month_Year'],
                y=monthly_revenue['Revenue'],
                name="Revenue",
                line=dict(color=DEC_BLUE, width=3),
                fill='tozeroy',
                fillcolor='rgba(40, 58, 142, 0.2)'
            ))
            
            if len(monthly_revenue) >= 3:
                fig.add_trace(go.Scatter(
                    x=monthly_revenue['Month_Year'],
                    y=monthly_revenue['Revenue'].rolling(window=3, min_periods=1).mean(),
                    name="3-Month Moving Average",
                    line=dict(color=DEC_GOLDEN_YELLOW, width=2, dash='dash')
                ))
            
            fig.update_layout(
                title="Monthly Revenue Trend",
                xaxis_title="Month",
                yaxis_title="Revenue ($)",
                hovermode='x unified',
                height=500
            )
            st.plotly_chart(fig, use_container_width=True)
            
            csv_revenue = monthly_revenue.to_csv(index=False).encode('utf-8')
            st.download_button("📥 Download Revenue Trend Data", data=csv_revenue, 
                              file_name="revenue_trend.csv", mime="text/csv")
        
        elif trend_view == "Product Performance":
            product_performance = filtered_df.groupby('Product_Category').agg({
                'Revenue': 'sum',
                'Total_Balance': 'sum',
                'Num_Customers': 'sum'
            }).reset_index()
            
            col1, col2 = st.columns(2)
            
            with col1:
                fig1 = px.bar(product_performance, x='Product_Category', y='Revenue',
                             title="Revenue by Product Category",
                             color='Revenue',
                             color_continuous_scale='Blues')
                fig1.update_layout(height=400)
                st.plotly_chart(fig1, use_container_width=True)
            
            with col2:
                fig2 = px.pie(product_performance, values='Total_Balance', names='Product_Category',
                             title="Balance Sheet Composition",
                             hole=0.3)
                fig2.update_traces(textposition='inside', textinfo='percent+label')
                st.plotly_chart(fig2, use_container_width=True)
            
            st.subheader("Product Performance Details")
            st.dataframe(product_performance.style.format({
                'Revenue': '${:,.2f}',
                'Total_Balance': '${:,.2f}',
                'Num_Customers': '{:,.0f}'
            }).background_gradient(cmap='Blues', subset=['Revenue']), use_container_width=True)
        
        elif trend_view == "Branch Performance":
            branch_performance = filtered_df.groupby('Branch').agg({
                'Revenue': 'sum',
                'Num_Customers': 'sum',
                'Digital_Adoption_Pct': 'mean'
            }).reset_index().sort_values('Revenue', ascending=False)
            
            fig = make_subplots(rows=1, cols=2, subplot_titles=("Revenue by Branch", "Digital Adoption by Branch"))
            
            fig.add_trace(
                go.Bar(x=branch_performance['Branch'], y=branch_performance['Revenue'], 
                       name="Revenue", marker_color=DEC_BLUE),
                row=1, col=1
            )
            
            fig.add_trace(
                go.Bar(x=branch_performance['Branch'], y=branch_performance['Digital_Adoption_Pct'], 
                       name="Digital Adoption %", marker_color=DEC_GOLDEN_YELLOW),
                row=1, col=2
            )
            
            fig.update_layout(height=500, showlegend=False)
            fig.update_xaxes(tickangle=45)
            st.plotly_chart(fig, use_container_width=True)
            
            st.subheader("Branch Performance Scorecard")
            branch_performance['Efficiency_Score'] = (branch_performance['Revenue'] / branch_performance['Revenue'].max() * 0.5 + 
                                                       branch_performance['Digital_Adoption_Pct'] / 100 * 0.5) * 100
            st.dataframe(branch_performance.style.format({
                'Revenue': '${:,.2f}',
                'Num_Customers': '{:,.0f}',
                'Digital_Adoption_Pct': '{:.1f}%',
                'Efficiency_Score': '{:.1f}'
            }).background_gradient(cmap='RdYlGn', subset=['Efficiency_Score']), use_container_width=True)
        
        else:
            regional_performance = filtered_df.groupby('Region').agg({
                'Revenue': 'sum',
                'Total_Balance': 'sum',
                'NPL_Ratio': 'mean'
            }).reset_index()
            
            col1, col2 = st.columns(2)
            
            with col1:
                fig1 = px.bar(regional_performance, x='Region', y='Revenue',
                             title="Revenue by Region",
                             color='Revenue',
                             color_continuous_scale='Greens')
                fig1.update_layout(height=400)
                st.plotly_chart(fig1, use_container_width=True)
            
            with col2:
                fig2 = px.bar(regional_performance, x='Region', y='NPL_Ratio',
                             title="NPL Ratio by Region",
                             color='NPL_Ratio',
                             color_continuous_scale='RdYlGn_r')
                fig2.add_hline(y=5, line_dash="dash", line_color="orange", annotation_text="Warning Threshold")
                fig2.add_hline(y=8, line_dash="dash", line_color="red", annotation_text="Critical Threshold")
                fig2.update_layout(height=400)
                st.plotly_chart(fig2, use_container_width=True)
    
    st.markdown("---")
    
    # ============ RISK DASHBOARD ============
    st.subheader("📊 Comprehensive Risk Dashboard")
    
    risk_tab1, risk_tab2, risk_tab3 = st.tabs(["Credit Risk", "Liquidity Risk", "Operational Risk"])
    
    with risk_tab1:
        credit_risk_data = filtered_df.groupby(['Product_Category', 'Quarter']).agg({
            'NPL_Ratio': 'mean',
            'Provision_Coverage': 'mean'
        }).reset_index()
        
        if not credit_risk_data.empty:
            fig = make_subplots(specs=[[{"secondary_y": True}]])
            
            fig.add_trace(
                go.Scatter(x=credit_risk_data['Quarter'].astype(str), y=credit_risk_data['NPL_Ratio'],
                          name="NPL Ratio (%)", line=dict(color='#dc3545', width=3)),
                secondary_y=False
            )
            
            fig.add_trace(
                go.Scatter(x=credit_risk_data['Quarter'].astype(str), y=credit_risk_data['Provision_Coverage'],
                          name="Provision Coverage (%)", line=dict(color='#28a745', width=3)),
                secondary_y=True
            )
            
            fig.add_hline(y=5, line_dash="dash", line_color="#ffc107", annotation_text="Warning Threshold (5%)", secondary_y=False)
            fig.add_hline(y=70, line_dash="dash", line_color="#28a745", annotation_text="Target (70%)", secondary_y=True)
            
            fig.update_layout(title="NPL Ratio vs Provision Coverage Trend", height=450, hovermode='x unified')
            fig.update_yaxes(title_text="NPL Ratio (%)", secondary_y=False)
            fig.update_yaxes(title_text="Provision Coverage (%)", secondary_y=True)
            st.plotly_chart(fig, use_container_width=True)
        
        product_risk = filtered_df.groupby('Product_Category')['NPL_Ratio'].mean().reset_index()
        product_risk = product_risk.sort_values('NPL_Ratio', ascending=False)
        
        fig = px.bar(product_risk, x='Product_Category', y='NPL_Ratio',
                    title="NPL Ratio by Product Category",
                    color='NPL_Ratio',
                    color_continuous_scale='RdYlGn_r')
        fig.add_hline(y=5, line_dash="dash", line_color="orange", annotation_text="Warning Threshold")
        fig.add_hline(y=8, line_dash="dash", line_color="red", annotation_text="Critical Threshold")
        fig.update_layout(height=500)
        st.plotly_chart(fig, use_container_width=True)
    
    with risk_tab2:
        liquidity_data = filtered_df.groupby('Month_Year').agg({
            'Liquidity_Ratio': 'mean',
            'Capital_Adequacy_Ratio': 'mean'
        }).reset_index()
        
        if not liquidity_data.empty:
            fig = go.Figure()
            fig.add_trace(go.Scatter(x=liquidity_data['Month_Year'], y=liquidity_data['Liquidity_Ratio'],
                                     name="Liquidity Ratio", line=dict(color=DEC_BLUE, width=3)))
            fig.add_trace(go.Scatter(x=liquidity_data['Month_Year'], y=liquidity_data['Capital_Adequacy_Ratio'],
                                     name="Capital Adequacy Ratio", line=dict(color=DEC_GOLDEN_YELLOW, width=3)))
            
            fig.add_hline(y=25, line_dash="dash", line_color="orange", annotation_text="Liquidity Minimum")
            fig.add_hline(y=12, line_dash="dash", line_color="red", annotation_text="CAR Minimum")
            
            fig.update_layout(title="Liquidity & Capital Adequacy Trends", height=500)
            st.plotly_chart(fig, use_container_width=True)
    
    with risk_tab3:
        operational_data = filtered_df.groupby('Branch').agg({
            'Digital_Adoption_Pct': 'mean',
            'Customer_Satisfaction': 'mean',
            'Cost_to_Income_Ratio': 'mean'
        }).reset_index()
        
        if not operational_data.empty:
            fig = px.scatter(operational_data, x='Digital_Adoption_Pct', y='Customer_Satisfaction',
                             size='Cost_to_Income_Ratio', color='Branch',
                             title="Operational Efficiency Matrix",
                             labels={'Digital_Adoption_Pct': 'Digital Adoption (%)', 
                                    'Customer_Satisfaction': 'Customer Satisfaction (1-5)'},
                             hover_data=['Cost_to_Income_Ratio'])
            fig.update_layout(height=500)
            st.plotly_chart(fig, use_container_width=True)
    
    st.markdown("---")
    
    # ============ EXECUTIVE SUMMARY ============
    st.subheader("📋 Executive Summary & Recommendations")
    
    col1, col2 = st.columns(2)
    
    with col1:
        liquidity_status = "✅ Adequate" if avg_liquidity_ratio >= 25 else "⚠️ Below Target"
        car_status = "✅ Compliant" if avg_capital_adequacy >= 12 else "⚠️ Below Regulatory"
        
        st.markdown(f"""
        <div style="background-color: {DEC_SUCCESS_GREEN}; padding: 15px; border-radius: 10px; border-left: 4px solid {DEC_BLUE};">
            <h4 style="color: {DEC_BLUE}; margin-top: 0;">Key Highlights</h4>
            <ul>
                <li>💰 Total Revenue: <strong>${total_revenue/1e6:,.2f}M</strong></li>
                <li>📈 Revenue Growth: <strong>{revenue_growth:+.1f}%</strong> quarter-over-quarter</li>
                <li>💧 Liquidity Ratio: <strong>{avg_liquidity_ratio:.1f}%</strong> {liquidity_status}</li>
                <li>🏦 Capital Adequacy: <strong>{avg_capital_adequacy:.1f}%</strong> {car_status}</li>
            </ul>
        </div>
        """, unsafe_allow_html=True)
    
    with col2:
        risk_status = "🟢 Low Risk" if avg_npl_ratio < 3 else "🟡 Moderate Risk" if avg_npl_ratio < 8 else "🔴 High Risk"
        efficiency_status = "🟢 Excellent" if avg_cost_to_income < 50 else "🟡 Acceptable" if avg_cost_to_income < 70 else "🔴 Needs Improvement"
        
        st.markdown(f"""
        <div style="background-color: {DEC_SUCCESS_GREEN}; padding: 15px; border-radius: 10px; border-left: 4px solid {DEC_GOLDEN_YELLOW};">
            <h4 style="color: {DEC_BLUE}; margin-top: 0;">Risk Assessment</h4>
            <ul>
                <li>⚠️ Credit Risk Status: <strong>{risk_status}</strong></li>
                <li>📉 NPL Ratio: <strong>{avg_npl_ratio:.1f}%</strong> {'✅ Healthy' if avg_npl_ratio < 5 else '⚠️ Monitor'}</li>
                <li>⚙️ Operational Efficiency: <strong>{efficiency_status}</strong></li>
                <li>⭐ Customer Satisfaction: <strong>{avg_customer_satisfaction:.1f}/5.0</strong></li>
            </ul>
        </div>
        """, unsafe_allow_html=True)
    
    st.markdown("---")
    
    csv_full = filtered_df.to_csv(index=False).encode('utf-8')
    st.download_button("📥 Download Complete Banking Report", data=csv_full, 
                      file_name=f"banking_report_{today.replace(' ', '_')}.csv", 
                      mime="text/csv")
    
    st.caption("© 2024 Muyamuri/Sezani Assistant - Commercial Banking BI Dashboard | Powered by Decision Edge Consultant")

# ============================================
# SUPPORTING FUNCTIONS (Keep from original)
# ============================================

def payment_successful():
    st.session_state['payment_popup'] = True
    return True

def tempfolderDelete(tempDirectory):
    if os.path.exists(tempDirectory):
        shutil.rmtree(tempDirectory)

@st.cache_data
def encode_pdf(file_path):
    try:
        with open(file_path, "rb") as f:
            file_content = f.read()
            return base64.b64encode(file_content).decode("utf-8")
    except Exception as e:
        st.error("Failed to encode the file.")
        return None

def displayPDF(file_path, unique_key, base64_pdf):
    if base64_pdf:
        pdf_display = f'<iframe id="pdf-frame-{unique_key}" src="data:application/pdf;base64,{base64_pdf}#toolbar=0" width="100%" height="450"></iframe>'
        st.markdown(pdf_display, unsafe_allow_html=True)
    else:
        st.error("Could not load PDF preview.")

def copy_file_to_temp(view_url, temp_pdf_path):
    try:
        shutil.copy(view_url, temp_pdf_path)
        return True
    except IOError as e:
        st.error(f"File copy failed: {e}")
        return False

def download_file_from_backend(filename, organisation=None):
    try:
        base_url = "http://127.0.0.1:4110"
        if organisation:
            url = f"{base_url}/api/download/{filename}?organisation={organisation}"
        else:
            url = f"{base_url}/api/download/{filename}"
        response = requests.get(url, stream=True)
        if response.status_code == 200:
            temp_dir = os.path.join(os.getcwd(), "temp_downloads")
            os.makedirs(temp_dir, exist_ok=True)
            temp_path = os.path.join(temp_dir, secure_filename(filename))
            with open(temp_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
            return temp_path
        else:
            return None
    except Exception as e:
        st.error(f"Download error: {e}")
        return None

def display_pdf_with_download(file_name, file_path, col):
    with col:
        unique_id = f"{file_name}_{datetime.now().timestamp()}"
        try:
            if os.path.exists(file_path):
                with open(file_path, "rb") as f:
                    pdf_data = f.read()
                    base64_pdf = base64.b64encode(pdf_data).decode("utf-8")
                pdf_display = f"""
                <div style="margin-bottom: 10px;">
                    <iframe id="pdf-frame-{unique_id}" src="data:application/pdf;base64,{base64_pdf}#toolbar=0" width="100%" height="450" style="border: 1px solid #ddd; border-radius: 5px;"></iframe>
                </div>
                """
                st.markdown(pdf_display, unsafe_allow_html=True)
                btn_col1, btn_col2 = st.columns(2)
                with btn_col1:
                    if st.button("🔄 Refresh Preview", key=f"refresh_{unique_id}"):
                        st.rerun()
                with btn_col2:
                    with open(file_path, "rb") as f:
                        pdf_bytes = f.read()
                        st.download_button(label="📥 Download PDF", data=pdf_bytes, file_name=file_name, mime="application/pdf", key=f"download_{unique_id}")
            else:
                st.error(f"File not found: {file_name}")
        except Exception as e:
            st.error(f"Error displaying PDF: {e}")

def display_chat_history(subscriber_number, userProfilePic):
    tempDirectory = f"./temp_{subscriber_number}"
    if os.path.exists(tempDirectory):
        shutil.rmtree(tempDirectory)
    os.makedirs(tempDirectory, exist_ok=True)
    for idx, chat in enumerate(reversed(st.session_state.chat_history)):
        for key in chat:
            if key == 'user':
                st.write(user_template.replace("{{MSG}}", chat['user']).replace("{{userProfilePic}}", userProfilePic), unsafe_allow_html=True)
            elif key == 'llm':
                st.write(bot_template.replace("{{MSG}}", chat['llm']), unsafe_allow_html=True)
            else:
                if chat.get('sources'):
                    st.markdown("**Sources:**")
                    grouped_sources = {}
                    for source in chat['sources']:
                        file_name = source.get('source', 'unknown').split(os.sep)[-1]
                        if file_name not in grouped_sources:
                            grouped_sources[file_name] = []
                        grouped_sources[file_name].append({
                            'Page number': source.get('Page number', 'N/A'),
                            'Page Content': source.get('Page Content', '')[:200] + "..."
                        })
                    file_names = list(grouped_sources.keys())
                    file_count = len(file_names)
                    if idx == 0 and file_count > 0:
                        for i in range(0, file_count, 2):
                            col1, col2 = st.columns(2)
                            if i < file_count:
                                file_name = file_names[i]
                                temp_pdf_path = os.path.join(tempDirectory, secure_filename(file_name))
                                downloaded_path = download_file_from_backend(file_name, subscriber_number)
                                if downloaded_path and os.path.exists(downloaded_path):
                                    shutil.copy(downloaded_path, temp_pdf_path)
                                    display_pdf_with_download(file_name, temp_pdf_path, col1)
                                else:
                                    with col1:
                                        st.warning(f"Unable to load {file_name}")
                            if i + 1 < file_count:
                                file_name = file_names[i + 1]
                                temp_pdf_path = os.path.join(tempDirectory, secure_filename(file_name))
                                downloaded_path = download_file_from_backend(file_name, subscriber_number)
                                if downloaded_path and os.path.exists(downloaded_path):
                                    shutil.copy(downloaded_path, temp_pdf_path)
                                    display_pdf_with_download(file_name, temp_pdf_path, col2)
                                else:
                                    with col2:
                                        st.warning(f"Unable to load {file_name}")
        st.markdown("---")

def display_same_chat_history(subscriber_number, userProfilePic):
    tempDirectory = f"./temp_{subscriber_number}"
    os.makedirs(tempDirectory, exist_ok=True)
    for idx, chat in enumerate(reversed(st.session_state.chat_history)):
        for key in chat:
            if key == 'user':
                st.write(user_template.replace("{{MSG}}", chat['user']).replace("{{userProfilePic}}", userProfilePic), unsafe_allow_html=True)
            elif key == 'llm':
                st.write(bot_template.replace("{{MSG}}", chat['llm']), unsafe_allow_html=True)
            else:
                if chat.get('sources'):
                    st.markdown("**Sources:**")
                    grouped_sources = {}
                    for source in chat['sources']:
                        file_name = source.get('source', 'unknown').split(os.sep)[-1]
                        if file_name not in grouped_sources:
                            grouped_sources[file_name] = []
                        grouped_sources[file_name].append({
                            'Page number': source.get('Page number', 'N/A'),
                            'Page Content': source.get('Page Content', '')[:200] + "..."
                        })
                    file_names = list(grouped_sources.keys())
                    file_count = len(file_names)
                    if idx == 0 and file_count > 0:
                        for i in range(0, file_count, 2):
                            col1, col2 = st.columns(2)
                            if i < file_count:
                                file_name = file_names[i]
                                temp_pdf_path = os.path.join(tempDirectory, secure_filename(file_name))
                                if os.path.exists(temp_pdf_path):
                                    display_pdf_with_download(file_name, temp_pdf_path, col1)
                                else:
                                    downloaded_path = download_file_from_backend(file_name, subscriber_number)
                                    if downloaded_path and os.path.exists(downloaded_path):
                                        shutil.copy(downloaded_path, temp_pdf_path)
                                        display_pdf_with_download(file_name, temp_pdf_path, col1)
                                    else:
                                        with col1:
                                            st.warning(f"Unable to load {file_name}")
                            if i + 1 < file_count:
                                file_name = file_names[i + 1]
                                temp_pdf_path = os.path.join(tempDirectory, secure_filename(file_name))
                                if os.path.exists(temp_pdf_path):
                                    display_pdf_with_download(file_name, temp_pdf_path, col2)
                                else:
                                    downloaded_path = download_file_from_backend(file_name, subscriber_number)
                                    if downloaded_path and os.path.exists(downloaded_path):
                                        shutil.copy(downloaded_path, temp_pdf_path)
                                        display_pdf_with_download(file_name, temp_pdf_path, col2)
                                    else:
                                        with col2:
                                            st.warning(f"Unable to load {file_name}")
        st.markdown("---")

def get_base64_image(image_path):
    try:
        with open(image_path, "rb") as image_file:
            base64_image = base64.b64encode(image_file.read()).decode("utf-8")
        return base64_image
    except:
        return ""

def save_uploaded_image(uploaded_image, subscriber_number):
    file_name = uploaded_image.name
    folder_path = f"./profiles/{subscriber_number}"
    os.makedirs(folder_path, exist_ok=True)
    image_path = os.path.join(folder_path, file_name)
    with open(image_path, "wb") as f:
        f.write(uploaded_image.getbuffer())
    return image_path

def delete_chat_session_history():
    """Delete the current chat session history"""
    if st.session_state.session_key != "new_session":
        conn = sqlite3.connect(config["chat_sessions_database_path"], check_same_thread=False)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM message_table WHERE session_id = ?", (st.session_state.session_key,))
        cursor.execute("DELETE FROM session_table WHERE session_id = ?", (st.session_state.session_key,))
        conn.commit()
        conn.close()
        st.session_state.chat_history = []
        st.session_state.session_key = "new_session"
        st.session_state.session_index_tracker = "new_session"
        st.success("Chat session deleted successfully!")
        st.rerun()

def clear_cache():
    """Clear the session cache"""
    st.cache_data.clear()
    st.cache_resource.clear()
    st.success("Cache cleared successfully!")
    st.rerun()

def handle_login():
    """Handle user login"""
    email = st.text_input("Email")
    password = st.text_input("Password", type="password")
    
    if "login_attempts" not in st.session_state:
        st.session_state.login_attempts = 0

    if st.button("Login"):
        attempts = st.session_state.login_attempts
        
        if attempts >= 3:
            st.error("🔴 Maximum retries exhausted, your account is locked. Please reset your password or contact administrator.")
            return

        status, user_id, user_name, userType, jobTitle = auth.login_user(email, password)

        if status == "success":
            st.session_state.login_attempts = 0
            st.session_state.authenticated = True
            st.session_state.user_id = user_id
            st.session_state.user_name = user_name
            st.session_state.email = email
            st.session_state.userType = userType
            st.session_state.jobTitle = jobTitle
            st.session_state.reset_code = None
            st.session_state.on_landing_page = True
            st.session_state.chat_history = []
            st.session_state.user_input = ''
            st.session_state.doc_info = None
            st.session_state.login_event_saved = False
            st.success(f"Welcome, {user_name}!")
            st.rerun()
        elif status == "Locked":
            st.error(f"🔴 Login failed! User is locked. Please contact the administrator.")
        elif status == "Unauthorised User":
            st.error(f"🔴 Login failed! User is not authorised to access the system at this time. Please contact the administrator.")
        elif status == "Unregistered":
            st.error(f"🔴 {email} is not registered. Please choose 'Sign Up' on the mode above to register.")
        elif status == "Wrong password":
            st.session_state.login_attempts = attempts + 1
            remaining_attempts = 3 - (attempts + 1)
            if remaining_attempts > 0:
                st.error(f"🔴 Login failed! Either email or password is incorrect. {remaining_attempts} attempts remaining, please try again.")
            else:
                if user_id is not None:
                    auth.user_status_update(user_id)
                    st.error("🔴 Maximum retries exhausted. Your account is now locked. Please reset your password or contact the administrator.")
        else:
            st.error("🔴 Login failed! Please check your credentials and try again.")

def handle_registration():
    """Handle user registration"""
    full_name = st.text_input("Full Name")
    email = st.text_input("Email")
    phone = st.text_input("Phone Number")
    password = st.text_input("Password", type="password")
    confirm_password = st.text_input("Confirm Password", type="password")
    user_type = st.selectbox("User Type", ["External", "Internal"])
    
    if st.button("Register"):
        if password != confirm_password:
            st.error("Passwords do not match")
        else:
            result = auth.register_user(full_name, email, phone, password, user_type)
            if result:
                st.success("Registration successful! Please login.")
                st.rerun()
            else:
                st.error("Registration failed. Email may already exist.")

def handle_password_reset():
    """Handle password reset"""
    email = st.text_input("Email")
    if st.button("Send Reset Link"):
        st.info("Password reset link would be sent to your email address.")

# ============================================
# MAIN APPLICATION
# ============================================

def main():
    # Main application logic
    if 'authenticated' not in st.session_state:
        st.session_state.authenticated = False
    if 'doc_info' not in st.session_state:
        st.session_state.doc_info = None
    if 'chat_history' not in st.session_state:
        st.session_state.chat_history = []
    if 'user_input' not in st.session_state:
        st.session_state.user_input = ''
    if 'on_landing_page' not in st.session_state:
        st.session_state.on_landing_page = True
    if 'userType' not in st.session_state:
        st.session_state.userType = 'External'
    if 'jobTitle' not in st.session_state:
        st.session_state.jobTitle = None
    if 'mode' not in st.session_state:
        st.session_state.mode = "My Data"
    if 'funeral_mode' not in st.session_state:
        st.session_state.funeral_mode = "demo1"  # Track which demo to show
    if 'funeral_demo_response' not in st.session_state:
        st.session_state.funeral_demo_response = ""
    if 'funeral_demo_prompt' not in st.session_state:
        st.session_state.funeral_demo_prompt = ""
    if 'source' not in st.session_state:
        st.session_state.source = "Flat file"
    if 'dashboard_type' not in st.session_state:
        st.session_state.dashboard_type = "Power Utility"

    if st.session_state.authenticated:

        # Dynamically set the page config based on the mode
        if st.session_state.mode == "Reports":
            st.set_page_config(page_title="Muyamuri/Sezani Assistant - BI Intelligence", page_icon=":bar_chart:", layout="wide")
        else:
            st.set_page_config(page_title="Muyamuri/Sezani Assistant", page_icon="./images/DecisionEdge.png", layout="wide")

        # Apply Decision Edge Consulting branding
        apply_decision_edge_branding()

        subscriber_number = auth.get_subscriber_number(st.session_state.user_id)
        folder_path = f'./profiles/{subscriber_number}'
        os.makedirs(folder_path, exist_ok=True)
        fileList = gb(f'./profiles/{subscriber_number}/*.*g')
        if len(fileList) != 0:
            fileName = max(fileList, key=os.path.getmtime)
            userProfilePic = get_base64_image(fileName)
        else:
            userProfilePic = ""
        st.write(css, unsafe_allow_html=True)

        # Sidebar with Decision Edge branding
        st.sidebar.markdown(f"""
            <div style="text-align: center; padding: 10px; border-bottom: 2px solid {DEC_GOLDEN_YELLOW}; margin-bottom: 15px;">
                <h3 style="color: {DEC_GOLDEN_YELLOW};">Muyamuri/Sezani</h3>
                <p style="color: {DEC_WHITE}; font-size: 12px;">Intelligent Assistant</p>
            </div>
        """, unsafe_allow_html=True)
        
        st.sidebar.write(f"Welcome, {st.session_state.user_name}")
        st.sidebar.image("./images/DecisionEdge.png", use_column_width=True)

        if "db_conn" not in st.session_state:
            st.session_state.session_key = "new_session"
            st.session_state.new_session_key = None
            st.session_state.session_index_tracker = "new_session"
            st.session_state.db_conn = sqlite3.connect(config["chat_sessions_database_path"], check_same_thread=False)
            st.session_state.audio_uploader_key = 0
            st.session_state.pdf_uploader_key = 1
        if st.session_state.session_key == "new_session" and st.session_state.new_session_key != None:
            st.session_state.session_index_tracker = st.session_state.new_session_key
            st.session_state.new_session_key = None

        if not st.session_state.login_event_saved:
            dtMain(st.session_state.user_id)
            auth.save_user_activity(st.session_state.user_id, "Logged In")
            st.session_state.login_event_saved = True

        if st.sidebar.button("Logout"):
            auth.save_user_activity(st.session_state.user_id, "Logged Out")
            st.session_state.authenticated = False
            st.session_state.email = None
            st.session_state.user_id = None
            st.session_state.user_name = None
            st.session_state.reset_code = None
            st.session_state.doc_info = None
            st.session_state.login_event_saved = False
            st.session_state.on_landing_page = True
            st.session_state.userType = None
            st.session_state.login_attempts = 0
            st.session_state.reset_code = None
            st.session_state.chat_history = []
            st.session_state.user_input = ''
            st.session_state.jobTitle = None    
            st.rerun()

        if (st.session_state.on_landing_page) & (st.session_state.userType == 'External'):
            st.title("Welcome to Muyamuri/Sezani Assistant")
            st.markdown(f"""
                <div style="background-color: {DEC_BLUE}; padding: 20px; border-radius: 10px; margin: 20px 0;">
                    <h3 style="color: {DEC_GOLDEN_YELLOW};">About Muyamuri/Sezani AI Assistant</h3>
                    <p style="color: {DEC_WHITE};">Muyamuri/Sezani Assistant is an AI-powered tool designed to assist you with research from archived and latest publications.</p>
                </div>
            """, unsafe_allow_html=True)
            st.write("""
                **Use Cases:**  
                - Research assistant for all titles publications.
                - Academic assistant for scholars and parents to help with homework.
                - Intelligent assistant to help with analysis of your documents privately.
                **Get Started:**  
                Click the button below to start chatting with Muyamuri/Sezani assistant.
            """)
            if st.button("Proceed to Chat"):
                st.session_state.on_landing_page = False
                st.rerun()

        elif (st.session_state.on_landing_page) & (st.session_state.userType != 'External') & (st.session_state.jobTitle not in ['Deputy General Manager', 'Manager']):
            st.title("Welcome to Muyamuri/Sezani Assistant...Let's work the smart way")
            st.markdown(f"""
                <div style="background-color: {DEC_BLUE}; padding: 20px; border-radius: 10px; margin: 20px 0;">
                    <h3 style="color: {DEC_GOLDEN_YELLOW};">About Muyamuri/Sezani AI Assistant</h3>
                    <p style="color: {DEC_WHITE};">Muyamuri/Sezani Assistant is an AI-powered tool designed to assist you in various tasks.</p>
                </div>
            """, unsafe_allow_html=True)
            st.write("**Get Started:** Click the button below to start chatting.")
            if st.button("Proceed to Chat"):
                st.session_state.on_landing_page = False
                st.rerun()

        elif (st.session_state.on_landing_page) & (st.session_state.userType != 'External') & (st.session_state.jobTitle in ['Deputy General Manager', 'Manager']):
            st.title("Welcome to Muyamuri/Sezani coManager Application...Let's work the smart way")
            st.markdown(f"""
                <div style="background-color: {DEC_BLUE}; padding: 20px; border-radius: 10px; margin: 20px 0;">
                    <h3 style="color: {DEC_GOLDEN_YELLOW};">About Muyamuri/Sezani coManager</h3>
                    <p style="color: {DEC_WHITE};">The application incorporates Muyamuri/Sezani Assistant which is an AI-powered tool designed to assist you.</p>
                </div>
            """, unsafe_allow_html=True)
            if st.button("Proceed to Chat"):
                st.session_state.on_landing_page = False
                st.rerun()

        else:
            # ============ MAIN APPLICATION LOGIC ============
            
            # Define mode selection at the top
            if st.session_state.userType == 'External':
                st.markdown("### 🚀 Application Modules")
                st.markdown("Select a module from the options below:")
                nav_col1, nav_col2, nav_col3, nav_col4, nav_col5 = st.columns(5)
                with nav_col1:
                    if st.button("📊 My Data", key="nav_my_data", use_container_width=True):
                        st.session_state.mode = "My Data"
                        st.rerun()
                with nav_col2:
                    if st.button("📚 Knowledge Centre", key="nav_knowledge", use_container_width=True):
                        st.session_state.mode = "Knowledge Centre"
                        st.rerun()
                with nav_col3:
                    if st.button("💬 Customer Service", key="nav_cs", use_container_width=True):
                        st.session_state.mode = "Customer Service Assistant"
                        st.rerun()
                with nav_col4:
                    if st.button("🏛️ Government", key="nav_government", use_container_width=True):
                        st.session_state.mode = "Government"
                        st.rerun()
                with nav_col5:
                    if st.button("🌾 Agriculture", key="nav_agriculture", use_container_width=True):
                        st.session_state.mode = "Agriculture"
                        st.rerun()
                st.markdown("---")
                st.markdown(f"### 📍 Current Module: {st.session_state.mode}")
                st.markdown("---")
            else:
                if st.session_state.jobTitle in ['Deputy General Manager', 'Manager']:
                    st.markdown("### 🚀 Application Modules")
                    st.markdown("Select a module from the options below:")
                    nav_col1, nav_col2, nav_col3, nav_col4, nav_col5, nav_col6, nav_col7, nav_col8 = st.columns(8)
                    with nav_col1:
                        if st.button("📊 My Data", key="nav_my_data", use_container_width=True):
                            st.session_state.mode = "My Data"
                            st.rerun()
                    with nav_col2:
                        if st.button("📚 Knowledge Centre", key="nav_knowledge", use_container_width=True):
                            st.session_state.mode = "Knowledge Centre"
                            st.rerun()
                    with nav_col3:
                        if st.button("💬 Customer Service", key="nav_cs", use_container_width=True):
                            st.session_state.mode = "Customer Service Assistant"
                            st.rerun()
                    with nav_col4:
                        if st.button("📋 Policies", key="nav_policies", use_container_width=True):
                            st.session_state.mode = "Procedure and Policies"
                            st.rerun()
                    with nav_col5:
                        if st.button("🏛️ Government", key="nav_government", use_container_width=True):
                            st.session_state.mode = "Government"
                            st.rerun()
                    with nav_col6:
                        if st.button("🌾 Agriculture", key="nav_agriculture", use_container_width=True):
                            st.session_state.mode = "Agriculture"
                            st.rerun()
                    with nav_col7:
                        if st.button("📈 BI Intelligence", key="nav_reports", use_container_width=True):
                            st.session_state.mode = "Reports"
                            st.rerun()
                    with nav_col8:  # Add new button after existing ones
                        if st.button("⚰️ Funeral Home AI", key="nav_funeral", use_container_width=True):
                            st.session_state.mode = "Funeral Home Assistant"
                            st.rerun()
                    st.markdown("---")
                    st.markdown(f"### 📍 Current Module: {st.session_state.mode}")
                    st.markdown("---")
                else:
                    st.markdown("### 🚀 Application Modules")
                    st.markdown("Select a module from the options below:")
                    nav_col1, nav_col2, nav_col3, nav_col4, nav_col5, nav_col6, nav_col7 = st.columns(7)
                    with nav_col1:
                        if st.button("📊 My Data", key="nav_my_data", use_container_width=True):
                            st.session_state.mode = "My Data"
                            st.rerun()
                    with nav_col2:
                        if st.button("📚 Knowledge Centre", key="nav_knowledge", use_container_width=True):
                            st.session_state.mode = "Knowledge Centre"
                            st.rerun()
                    with nav_col3:
                        if st.button("💬 Customer Service", key="nav_cs", use_container_width=True):
                            st.session_state.mode = "Customer Service Assistant"
                            st.rerun()
                    with nav_col4:
                        if st.button("📋 Policies", key="nav_policies", use_container_width=True):
                            st.session_state.mode = "Procedure and Policies"
                            st.rerun()
                    with nav_col5:
                        if st.button("🏛️ Government", key="nav_government", use_container_width=True):
                            st.session_state.mode = "Government"
                            st.rerun()
                    with nav_col6:
                        if st.button("🌾 Agriculture", key="nav_agriculture", use_container_width=True):
                            st.session_state.mode = "Agriculture"
                            st.rerun()
                    with nav_col7:  # Add new button after existing ones
                        if st.button("⚰️ Funeral Home AI", key="nav_funeral", use_container_width=True):
                            st.session_state.mode = "Funeral Home Assistant"
                            st.rerun()
                    st.markdown("---")
                    st.markdown(f"### 📍 Current Module: {st.session_state.mode}")
                    st.markdown("---")
            
            # Now handle the current mode
            current_mode = st.session_state.mode
            
            if current_mode == "Reports":
                # ============ BI INTELLIGENCE DASHBOARD WITH TOGGLE ============
                st.markdown("## 📊 Business Intelligence Platform")
                st.markdown("### Executive Decision Support System")
                
                # Dashboard Toggle
                st.markdown("---")
                st.markdown("### Select Dashboard View")
                
                toggle_col1, toggle_col2 = st.columns(2)
                with toggle_col1:
                    power_active = st.session_state.dashboard_type == "Power Utility"
                    if st.button("⚡ ZETDC Power Utility Dashboard", use_container_width=True, type="primary" if power_active else "secondary"):
                        st.session_state.dashboard_type = "Power Utility"
                        st.rerun()
                with toggle_col2:
                    banking_active = st.session_state.dashboard_type == "Commercial Banking"
                    if st.button("🏦 Commercial Banking BI Dashboard", use_container_width=True, type="primary" if banking_active else "secondary"):
                        st.session_state.dashboard_type = "Commercial Banking"
                        st.rerun()
                st.markdown("---")
                
                if st.session_state.dashboard_type == "Power Utility":
                    try:
                        power_df = pd.DataFrame()
                        filtered_power_df = pd.DataFrame()
                        
                        st.sidebar.markdown("### ⚡ Power Utility Data Source")
                        source = st.sidebar.radio("Choose Data Source:", ["Flat File", "Database"], index=0 if st.session_state.get('source', 'Flat file') == 'Flat file' else 1, horizontal=True, key="power_source_selector")
                        st.session_state.source = source
                        st.sidebar.markdown("---")
                        
                        if source == "Database":
                            st.sidebar.info("📡 Connecting to Power Database...")
                            try:
                                conn_str = connString()[0]
                                if st.sidebar.checkbox("Generate Sample Power Generation Data", value=False, key="gen_power_data"):
                                    with st.spinner("Generating power test data..."):
                                        test_df = generate_power_company_test_data()
                                        if save_power_test_data_to_database(test_df, conn_str):
                                            st.success("✅ Generated power test records successfully!")
                                            st.rerun()
                                        else:
                                            st.error("Failed to save power data to database")
                                power_df = load_power_data_from_db(conn_str)
                                if not power_df.empty:
                                    success_html = f"""
                                    <div style="
                                        background-color: #28a745; 
                                        color: #ffffff; 
                                        padding: 12px 20px; 
                                        border-radius: 8px; 
                                        border-left: 5px solid #155724;
                                        margin: 10px 0;
                                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                                        font-size: 15px;
                                        font-weight: 500;
                                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                                    ">
                                        <span style="font-size: 18px; margin-right: 10px;">✅</span> 
                                        Loaded {len(power_df):,} power records from database
                                    </div>
                                    """
                                    st.markdown(success_html, unsafe_allow_html=True)
                                    filtered_power_df = power_df.copy()
                                else:
                                    st.warning("No power data found in database. Please generate sample data.")
                                    filtered_power_df = pd.DataFrame()
                            except Exception as e:
                                st.error(f"Database connection error: {e}")
                                filtered_power_df = pd.DataFrame()
                        else:
                            st.sidebar.info("📁 Using Flat File Data Source")
                            use_default = st.sidebar.checkbox("Use Default Power Sample Data", value=True, key="use_power_default")
                            if not use_default:
                                uploaded_file = st.sidebar.file_uploader("Upload Power Excel/CSV File", type=["xlsx", "xls", "csv"], key="power_file_uploader")
                                if uploaded_file is not None:
                                    try:
                                        if uploaded_file.name.endswith('.csv'):
                                            power_df = pd.read_csv(uploaded_file)
                                        else:
                                            power_df = pd.read_excel(uploaded_file)
                                        power_df.columns = [col.replace(' ', '_') for col in power_df.columns]
                                        st.success(f"✅ Loaded {len(power_df):,} records")
                                        filtered_power_df = power_df.copy()
                                    except Exception as e:
                                        st.error(f"Error loading file: {e}")
                                        filtered_power_df = pd.DataFrame()
                            else:
                                with st.spinner("Loading default power sample data..."):
                                    power_df = generate_power_company_test_data()
                                    filtered_power_df = power_df.copy()
                                    success_html = f"""
                                    <div style="
                                        background-color: #28a745; 
                                        color: #ffffff; 
                                        padding: 12px 20px; 
                                        border-radius: 8px; 
                                        border-left: 5px solid #155724;
                                        margin: 10px 0;
                                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                                        font-size: 15px;
                                        font-weight: 500;
                                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                                    ">
                                        <span style="font-size: 18px; margin-right: 10px;">✅</span> 
                                        Generated {len(power_df):,} power sample records
                                    </div>
                                    """
                                    st.markdown(success_html, unsafe_allow_html=True)
                        
                        if not filtered_power_df.empty:
                            date_col = None
                            for col in ['Order_Date', 'OrderDate', 'Date']:
                                if col in filtered_power_df.columns:
                                    date_col = col
                                    break
                            if date_col:
                                filtered_power_df[date_col] = pd.to_datetime(filtered_power_df[date_col])
                                start_date = filtered_power_df[date_col].min()
                                end_date = filtered_power_df[date_col].max()
                                st.sidebar.markdown("---")
                                st.sidebar.header("📅 Date Range Filter")
                                col1, col2 = st.sidebar.columns(2)
                                with col1:
                                    date1 = st.date_input("Start Date", start_date, key="power_start_date")
                                with col2:
                                    date2 = st.date_input("End Date", end_date, key="power_end_date")
                                filtered_power_df = filtered_power_df[(filtered_power_df[date_col] >= pd.to_datetime(date1)) & (filtered_power_df[date_col] <= pd.to_datetime(date2))].copy()
                            today = datetime.now().strftime("%d %B %Y")
                            render_power_utility_dashboard(filtered_power_df, power_df, today)
                        else:
                            st.warning("No power data available to display dashboard. Please generate sample data using the checkbox above.")
                    except Exception as e:
                        st.error(f"Error loading power dashboard data: {e}")
                
                else:  # Commercial Banking
                    try:
                        banking_df = pd.DataFrame()
                        filtered_banking_df = pd.DataFrame()
                        
                        st.sidebar.markdown("### 🏦 Commercial Banking Data Source")
                        source = st.sidebar.radio("Choose Data Source:", ["Flat File", "Database"], index=0 if st.session_state.get('banking_source', 'Flat file') == 'Flat file' else 1, horizontal=True, key="banking_source_selector")
                        st.session_state.banking_source = source
                        st.sidebar.markdown("---")
                        
                        if source == "Database":
                            st.sidebar.info("📡 Connecting to Banking Database...")
                            try:
                                conn_str = connString()[0]
                                if st.sidebar.checkbox("Generate Sample Banking Data", value=False, key="gen_banking_data"):
                                    with st.spinner("Generating banking test data..."):
                                        test_df = generate_banking_test_data()
                                        save_banking_data_to_database(test_df, conn_str)
                                        st.success("✅ Generated banking test records successfully!")
                                        st.rerun()
                                banking_df = load_banking_data_from_db(conn_str)
                                if not banking_df.empty:
                                    success_html = f"""
                                    <div style="
                                        background-color: #28a745; 
                                        color: #ffffff; 
                                        padding: 12px 20px; 
                                        border-radius: 8px; 
                                        border-left: 5px solid #155724;
                                        margin: 10px 0;
                                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                                        font-size: 15px;
                                        font-weight: 500;
                                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                                    ">
                                        <span style="font-size: 18px; margin-right: 10px;">✅</span> 
                                        Loaded {len(banking_df):,} banking records from database
                                    </div>
                                    """
                                    st.markdown(success_html, unsafe_allow_html=True)
                                    filtered_banking_df = banking_df.copy()
                                else:
                                    st.warning("No banking data found in database. Please generate sample data.")
                                    filtered_banking_df = pd.DataFrame()
                            except Exception as e:
                                st.error(f"Database connection error: {e}")
                                filtered_banking_df = pd.DataFrame()
                        else:
                            st.sidebar.info("📁 Using Flat File Data Source")
                            banking_file_path = "banking_data.csv"
                            use_default = st.sidebar.checkbox("Use Default Banking Sample Data", value=True, key="use_banking_default")
                            
                            if not use_default:
                                uploaded_file = st.sidebar.file_uploader("Upload Banking Excel/CSV File", type=["xlsx", "xls", "csv"], key="banking_file_uploader")
                                if uploaded_file is not None:
                                    try:
                                        if uploaded_file.name.endswith('.csv'):
                                            banking_df = pd.read_csv(uploaded_file)
                                        else:
                                            banking_df = pd.read_excel(uploaded_file)
                                        banking_df.columns = [col.replace(' ', '_') for col in banking_df.columns]
                                        st.success(f"✅ Loaded {len(banking_df):,} records")
                                        filtered_banking_df = banking_df.copy()
                                    except Exception as e:
                                        st.error(f"Error loading file: {e}")
                                        filtered_banking_df = pd.DataFrame()
                            else:
                                with st.spinner("Loading default banking sample data..."):
                                    if os.path.exists(banking_file_path):
                                        banking_df = load_banking_data_from_flat_file(banking_file_path)
                                        if banking_df is not None and not banking_df.empty:
                                            success_html = f"""
                                            <div style="
                                                background-color: #28a745; 
                                                color: #ffffff; 
                                                padding: 12px 20px; 
                                                border-radius: 8px; 
                                                border-left: 5px solid #155724;
                                                margin: 10px 0;
                                                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                                                font-size: 15px;
                                                font-weight: 500;
                                                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                                            ">
                                                <span style="font-size: 18px; margin-right: 10px;">✅</span> 
                                                Loaded {len(banking_df):,} banking records from flat file
                                            </div>
                                            """
                                            st.markdown(success_html, unsafe_allow_html=True)
                                            filtered_banking_df = banking_df.copy()
                                        else:
                                            banking_df = generate_banking_test_data()
                                            save_banking_data_to_flat_file(banking_df, banking_file_path)
                                            filtered_banking_df = banking_df.copy()
                                            st.success(f"✅ Generated and saved {len(banking_df):,} banking sample records")
                                    else:
                                        banking_df = generate_banking_test_data()
                                        save_banking_data_to_flat_file(banking_df, banking_file_path)
                                        filtered_banking_df = banking_df.copy()
                                        st.success(f"✅ Generated and saved {len(banking_df):,} banking sample records")
                        
                        if not filtered_banking_df.empty:
                            if 'Date' in filtered_banking_df.columns:
                                filtered_banking_df['Date'] = pd.to_datetime(filtered_banking_df['Date'])
                                start_date = filtered_banking_df['Date'].min()
                                end_date = filtered_banking_df['Date'].max()
                                st.sidebar.markdown("---")
                                st.sidebar.header("📅 Date Range Filter")
                                col1, col2 = st.sidebar.columns(2)
                                with col1:
                                    date1 = st.date_input("Start Date", start_date, key="banking_start_date")
                                with col2:
                                    date2 = st.date_input("End Date", end_date, key="banking_end_date")
                                filtered_banking_df = filtered_banking_df[(filtered_banking_df['Date'] >= pd.to_datetime(date1)) & (filtered_banking_df['Date'] <= pd.to_datetime(date2))].copy()
                            today = datetime.now().strftime("%d %B %Y")
                            render_banking_bi_dashboard(filtered_banking_df, banking_df, today)
                        else:
                            st.warning("No banking data available to display dashboard. Please generate sample data using the checkbox above.")
                    except Exception as e:
                        st.error(f"Error loading banking dashboard data: {e}")
            
            elif (st.session_state.userType == 'External'):
                # External user chat logic
                st.sidebar.title("Chat Sessions")
                chat_sessions = ["new_session"] + get_all_chat_history_ids(st.session_state.user_id)   
                index = chat_sessions.index(st.session_state.session_index_tracker)
                st.sidebar.selectbox("Select a chat session", chat_sessions, key="session_key", index=index)
                pdf_toggle_col = st.sidebar
                pdf_toggle_col.toggle("Muyamuri Chat", key="muntu_chat", value=False)
                delete_chat_col, clear_cache_col = st.sidebar.columns(2)
                delete_chat_col.button("Delete Chat Session", on_click=delete_chat_session_history)
                clear_cache_col.button("Clear Session Cache", on_click=clear_cache)
                st.sidebar.header("Upload your own Documents to analyse and chat with?")
                uploaded_files = st.sidebar.file_uploader("Choose a file", type=["docx", "xlsx", "pptx", "pdf"], accept_multiple_files=True)
                profilePicture = st.sidebar.file_uploader("Upload a profile picture", type=["jpeg", "png", "jpg"], key="Profile_Picture_External")
                modeDB = st.sidebar.selectbox("Choose Database:", ["My Data"])
                submit_button = st.sidebar.button("Submit", key="submit_external")
                if submit_button and uploaded_files and modeDB:
                    uploadHandler(subscriber_number, uploaded_files, modeDB)
                elif submit_button and profilePicture:
                    image_path = save_uploaded_image(profilePicture, subscriber_number)
                    if image_path:
                        st.success(f"Image successfully uploaded and saved at {image_path}")
                myCol1, myCol2 = st.columns([1, 10])
                with myCol1:
                    base64_img = get_base64_image("./images/DecisionEdge.png")
                    st.markdown(f'<div style="text-align: right;"><img src="data:image/png;base64,{base64_img}" style="width:100%;"></div>', unsafe_allow_html=True)
                with myCol2:
                    st.markdown('<div style="text-align: center;"><h1>You are utilising Muyamuri/Sezani to chat with your private data 📰</h1></div>', unsafe_allow_html=True)
                imagePrompt, textVoicePrompt = st.columns([1, 3])
                with textVoicePrompt:
                    user_input = st.text_input("Let us have fun, ask right away:", value=st.session_state.user_input, key="user_input_external")
                    st.write("Make a voice prompt")
                    voice_recording = mic_recorder(start_prompt="Record Audio", stop_prompt="Stop recording", just_once=True, key="queryRecording_external")
                with imagePrompt:
                    uploaded_file = st.file_uploader("Upload an image", type=["jpg", "jpeg", "png"], key="imageUploader_external")
                col1, col2, col3 = st.columns([1, 1, 1])
                with col1:
                    send_button = st.button("Send", key="send_button_external")
                with col2:
                    cancel_button = st.button("Cancel", key="cancel_button_external")
                with col3:
                    if st.button("Clear Chat History", key="clear_history_external"):
                        st.session_state.chat_history = []
                        st.rerun()
                if cancel_button:
                    st.session_state.user_input = ''
                    st.rerun()
                if send_button and user_input:
                    org_mapping = {"My Data": subscriber_number, "Knowledge Centre": "Zimpapers", "Customer Service Assistant": "csAssistant", "Procedure and Policies": "zimpapersPL", "Government": "government", "Agriculture": "agriculture"}
                    organisation = org_mapping.get(current_mode, subscriber_number)
                    endpoint = "http://127.0.0.1:4110/dbQuerying"
                    response = requests.post(endpoint, json={"organisation": organisation, "query": user_input})
                    if response.status_code == 200:
                        response_data = response.json()
                        llm_response = response_data.get("answer", "No response from LLM")
                        sources = response_data.get("sources", [])
                        st.session_state.chat_history.append({"user": user_input, "llm": llm_response, "sources": sources})
                        display_chat_history(subscriber_number, userProfilePic)
                    else:
                        st.error("Failed to get a response from the model.")
                elif len(st.session_state.chat_history) != 0:
                    display_same_chat_history(subscriber_number, userProfilePic)
            elif current_mode == "Funeral Home Assistant":
                render_funeral_home_assistant()             
            else:
                # Internal user chat logic
                if current_mode != "Reports":
                    st.sidebar.title("Chat Sessions")
                    chat_sessions = ["new_session"] + get_all_chat_history_ids(st.session_state.user_id)   
                    index = chat_sessions.index(st.session_state.session_index_tracker)
                    st.sidebar.selectbox("Select a chat session", chat_sessions, key="session_key_internal", index=index)
                    pdf_toggle_col = st.sidebar
                    pdf_toggle_col.toggle("Muyamuri Chat", key="muntu_chat_internal", value=False)
                    delete_chat_col, clear_cache_col = st.sidebar.columns(2)
                    delete_chat_col.button("Delete Chat Session", on_click=delete_chat_session_history)
                    clear_cache_col.button("Clear Session Cache", on_click=clear_cache)
                    st.sidebar.header("Upload Documents and Connect to Database")
                    uploaded_files = st.sidebar.file_uploader("Choose a file", type=["docx", "xlsx", "pptx", "pdf"], accept_multiple_files=True, key="file_uploader_internal")
                    profilePicture = st.sidebar.file_uploader("Upload a profile picture", type=["jpeg", "png", "jpg"], key="Profile_Picture_Internal")
                    modeDB = st.sidebar.selectbox("Choose Database:", ["My Data", "Knowledge Centre", "Procedure and Policies", "Customer Service Assistant", "Government", "Agriculture"], key="db_select_internal")
                    submit_button = st.sidebar.button("Submit", key="submit_internal")
                    if submit_button and uploaded_files and modeDB:
                        uploadHandler(subscriber_number, uploaded_files, modeDB)
                    elif submit_button and profilePicture:
                        image_path = save_uploaded_image(profilePicture, subscriber_number)
                        if image_path:
                            st.success(f"Image successfully uploaded and saved at {image_path}")
                    myCol1, myCol2 = st.columns([1, 10])
                    with myCol1:
                        base64_img = get_base64_image("./images/DecisionEdge.png")
                        st.markdown(f'<div style="text-align: right;"><img src="data:image/png;base64,{base64_img}" style="width:100%;"></div>', unsafe_allow_html=True)
                    with myCol2:
                        st.markdown('<div style="text-align: center;"><h1>You are utilising Muyamuri/Sezani to chat with your private data 📰</h1></div>', unsafe_allow_html=True)
                    imagePrompt, textVoicePrompt = st.columns([1, 3])
                    with textVoicePrompt:
                        user_input = st.text_input("Let us have fun, ask right away:", value=st.session_state.user_input, key="user_input_mydata")
                        st.write("Make a voice prompt")
                        voice_recording = mic_recorder(start_prompt="Record Audio", stop_prompt="Stop recording", just_once=True, key="queryRecording_mydata")
                    with imagePrompt:
                        uploaded_file = st.file_uploader("Upload an image", type=["jpg", "jpeg", "png"], key="imageUploader_mydata")
                    col1, col2, col3 = st.columns([1, 1, 1])
                    with col1:
                        send_button = st.button("Send", key="send_button_internal")
                    with col2:
                        cancel_button = st.button("Cancel", key="cancel_button_internal")
                    with col3:
                        if st.button("Clear Chat History", key="clear_history_internal"):
                            st.session_state.chat_history = []
                            st.rerun()
                    if cancel_button:
                        st.session_state.user_input = ''
                        st.rerun()
                    if send_button and user_input:
                        org_mapping = {"My Data": subscriber_number, "Knowledge Centre": "Zimpapers", "Customer Service Assistant": "csAssistant", "Procedure and Policies": "zimpapersPL", "Government": "government", "Agriculture": "agriculture"}
                        organisation = org_mapping.get(current_mode, subscriber_number)
                        endpoint = "http://127.0.0.1:4110/dbQuerying"
                        response = requests.post(endpoint, json={"organisation": organisation, "query": user_input})
                        if response.status_code == 200:
                            response_data = response.json()
                            llm_response = response_data.get("answer", "No response from LLM")
                            sources = response_data.get("sources", [])
                            st.session_state.chat_history.append({"user": user_input, "llm": llm_response, "sources": sources})
                            display_chat_history(subscriber_number, userProfilePic)
                        else:
                            st.error("Failed to get a response from the model.")
                    elif len(st.session_state.chat_history) != 0:
                        display_same_chat_history(subscriber_number, userProfilePic)
    
    else:
        # Not authenticated - show login page
        st.set_page_config(page_title="Muyamuri/Sezani Assistant", page_icon="images/DecisionEdge.png")
        st.markdown(f"""
            <style>
                .stApp {{ background-color: {DEC_WHITE}; }}
                h1, h2, h3, h4 {{ color: {DEC_BLUE} !important; }}
                .stButton > button {{ background-color: {DEC_BLUE}; color: {DEC_WHITE}; }}
                .stButton > button:hover {{ background-color: {DEC_GOLDEN_YELLOW}; color: {DEC_BLACK}; }}
                .decision-edge-footer {{
                    position: fixed; bottom: 0; left: 0; right: 0; background-color: {DEC_BLACK};
                    color: {DEC_WHITE}; text-align: center; padding: 10px; font-size: 14px;
                    z-index: 999; border-top: 3px solid {DEC_GOLDEN_YELLOW};
                }}
            </style>
            <div class="decision-edge-footer">
                Muyamuri/Sezani Assistant | Powered by <a href="#" target="_blank" style="color: {DEC_GOLDEN_YELLOW};">Decision Edge Consultant</a> | © 2024
            </div>
        """, unsafe_allow_html=True)
        st.markdown(css, unsafe_allow_html=True)
        st.image("images/DecisionEdgeLogo.png", use_column_width=True)
        st.title("Muyamuri/Sezani Assistant Login")
        login_mode = st.selectbox("Choose Login Mode:", ["Log in", "Sign Up", "Forgot Password"])
        if login_mode == "Log in":
            handle_login()
        elif login_mode == "Sign Up":
            handle_registration()
        else:
            handle_password_reset()

if __name__ == "__main__":
    main()