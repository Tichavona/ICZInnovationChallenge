from llm_axe import make_prompt, OllamaChat, AgentType, OnlineAgent, FunctionCaller, Agent


def internet():
    """Choose if the internet is required or if we don't have information about the topic"""
    return ""

def no_internet():
    """Choose if the internet is not required"""
    return ""

def internet_required(user_input):
    """Determine if the internet is required for the user's query."""
    prompt = '''
    You are an AI assistant.
    Determine whether or not the internet is required to answer the user's prompt.
    If the internet is not required, answer "no internet required".
    If the internet is required, answer "internet required".

    Internet is required if you don't have information about the topic and the user's prompt is talking about something SPECIFIC that we need solid FACTS for.
    Internet is not required if you believe that the internet is not required to correctly answer the user's question.

    Do not respond with anything else.
    '''
    
    llm = OllamaChat(model="llama3")
    plan_agent = Agent(llm, custom_system_prompt=prompt)
    function_caller = FunctionCaller(llm, functions=[internet, no_internet])

    # Determine if internet is needed
    plan = plan_agent.ask("USERS INPUT: " + user_input)
    func_resp = function_caller.get_function(plan) 
    if func_resp is not None:
        function_name = func_resp["function"].__name__
        return function_name == "internet"
    return False

def search_internet(query):
    """Search the internet for an answer to the user's query."""
    llm = OllamaChat(model="llama3")
    online_agent = OnlineAgent(llm)
    response = online_agent.search(query)
    return response
