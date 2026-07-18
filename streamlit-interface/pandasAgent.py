import pandas as pd
from dbConnection import connString
from userManagement import UserAuth
from langchain_community.agent_toolkits.sql.base import create_sql_agent as csqla
from langchain_community.agent_toolkits.sql.toolkit import SQLDatabaseToolkit as sqldbtk
from langchain.agents.agent_types import AgentType as at
from langchain_community.llms import Ollama
from langchain_community.chat_models.ollama import ChatOllama as co
from langchain_community.chat_models.openai import ChatOpenAI
from langchain_community.utilities import SQLDatabase as sqldb, sql_database,powerbi,serpapi
from langchain.prompts.chat import ChatPromptTemplate as ctp
from sqlalchemy import create_engine as ce
from pydantic import ValidationError


# auth = UserAuth(db_conn_str=connString()[0])
# df = auth.dbQuery()

url = db_conn_str=connString()[1]
db_engine = ce(url)
db = sqldb(db_engine)

llm = Ollama(
    model="llama3.1:8b",
    temperature = 0.0,
    top_p = 0.0
    )

sql_toolkit = sqldbtk(llm=llm, db=db)
sql_toolkit.get_tools()

prompt = ctp.from_messages(
    [
        ("system",
         """
            You are an intelligent AI Assistant who is expert in identifying relevant quedtion from user and converting them into
            sql queries to generate correct answer. Please, use the below context to write the microsoft sql queries, do not use
            mysql queries.

            context:
            You must query against the connected database which has 5 tables namely DeviceInfo, chatHistory, employees, userStatus and users.
            DeviceInfo has 16 columns namley id, userAgent, platform, language, screenWidth, screenHeight, connectionType, providerIP, 
            machineIP, latitude, longitude, deviceType, deviceBrand, deviceModel, collectionTime and UserID which foreign key from users table.
            DeviceInfo table gives information about the device user is accessing the system from and their geolocation details.
            chatHistory has 5 columns namely user_id, user_input, llm_response, sources, timestamp where user_id is foreign key from users table
            chatHistory table gives information about the conversation history of the user and llm model.
            employees table 10 columns namely id, email, first_name, surname, DOB, mobile_number, address, employeeNumber, department, jobTitle which gives employee details
            users table has 12 columns namely id, email, first_name, surname, DOB, mobile_number, subscriber_number, department, 
            profession, password_hash, user_type, Locked, inputUser, authoriser and gives information of users details
            userStatus has 4 columns namely id, status, eventTime, UserID where UserID is foreign key from users table
            As an expert you must use joints whenever required.
        """
        ), 
        ("user", "{question}\ ai: ")
    ]
)

# Initialize the agent with error handling
agent = csqla(
    llm=llm,
    toolkit=sql_toolkit,
    agent_type=at.ZERO_SHOT_REACT_DESCRIPTION,
    verbose=True,
    max_execution_time=100,
    max_iterations=1000,
    handle_parsing_errors=True  # This enables retry on parsing errors
)

# Run the agent with a question
response = agent.invoke("Which user is most active on the platform, how long are they logged in on average?")
print(response)




