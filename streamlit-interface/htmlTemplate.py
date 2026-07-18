css = '''
<style>
/* Chat Interface Background */
body {
    background-color: #ffffff; /* Set chat interface background to white */
}

/* Sidebar Background and Text */
.stSidebar {
    background-color: #90EE90; /* Set sidebar background to light green */
    color: #006400; /* Set sidebar text color to dark green */
}

/* Chat Messages */
.chat-message {
    padding: 1.5rem; 
    border-radius: 0.5rem; 
    margin-bottom: 1rem; 
    display: flex;
    align-items: center; /* Ensure the items are centered vertically */
}
.chat-message.user {
    background-color: #2b313e;
    flex-direction: row; /* User image on the left */
}
.chat-message.bot {
    background-color: #475063;
    flex-direction: row-reverse; /* Bot image on the right */
}
.chat-message .avatar {
    width: 20%;
}
.chat-message .avatar img {
    width: 78px;
    height: 78px;
    border-radius: 50%;
    object-fit: cover;
}
.chat-message .message {
    width: 80%;
    padding: 0 1.5rem;
    color: #fff;
}

/* Sidebar Text Specific Styling */
.stSidebar .css-1lcbmhc p, .stSidebar .css-1lcbmhc label {
    color: #006400; /* Set sidebar text color to dark green */
}
</style>
'''

bot_template = '''
<div class="chat-message bot">
    <div class="avatar">
        <img src="https://i.ibb.co/cN0nmSj/Screenshot-2023-05-28-at-02-37-21.png">
    </div>
    <div class="message">{{MSG}}</div>
</div>
'''

user_template = '''
<div class="chat-message user">
    <div class="avatar">
        <img src="data:image/png;base64,{{userProfilePic}}">
    </div>    
    <div class="message">{{MSG}}</div>
</div>
'''
