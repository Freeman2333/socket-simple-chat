import React, { useEffect, useState } from "react";
import ScrollToBottom from "react-scroll-to-bottom";

function Chat({ socket, username, room }) {
  const [currentMessage, setCurrentMessage] = useState("");
  const [messageList, setMessageList] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  console.log({ onlineUsers });
  const sendMessage = async () => {
    if (currentMessage !== "") {
      const messageData = {
        room: room,
        author: username,
        message: currentMessage,
        time:
          new Date(Date.now()).getHours() +
          ":" +
          new Date(Date.now()).getMinutes(),
      };

      await socket.emit("send_message", messageData);
      setMessageList((list) => [...list, messageData]);
      setCurrentMessage("");
    }
  };

  const handleTyping = () => {
    socket.emit("typing", { room });
  };

  const handleStoppedTyping = () => {
    socket.emit("stoppedTyping", { room });
  };

  useEffect(() => {
    socket.on("receive_message", (data) => {
      setMessageList((list) => [...list, data]);
    });

    socket.on("onlineUsers", (users) => {
      setOnlineUsers(users);
    });
  }, [socket]);

  return (
    <div className="chat-window">
      <div className="online-users">
        {!!onlineUsers.length && (
          <>
            <p>Online Users:</p>
            <ul>
              {onlineUsers.map((user) => (
                <li key={user.id}>
                  <span className="online-user-icon"></span>
                  <span className="online-user-name">{user.username}</span>
                  {user.typing && (
                    <span span className="typing-indicator">
                      {" typing..."}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
      <div className="chat-header">
        <p>Live Chat</p>
      </div>
      <div className="chat-body">
        <ScrollToBottom className="message-container">
          {messageList.map((messageContent) => {
            return (
              <div
                className="message"
                id={username === messageContent.author ? "you" : "other"}
              >
                <div>
                  <div className="message-content">
                    <p>{messageContent.message}</p>
                  </div>
                  <div className="message-meta">
                    <p id="time">{messageContent.time}</p>
                    <p id="author">{messageContent.author}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </ScrollToBottom>
      </div>
      <div className="chat-footer">
        <input
          type="text"
          value={currentMessage}
          placeholder="Hey..."
          onChange={(event) => {
            setCurrentMessage(event.target.value);
            handleTyping();
          }}
          onBlur={handleStoppedTyping}
          onKeyPress={(event) => {
            event.key === "Enter" && sendMessage();
          }}
        />
        <button onClick={sendMessage}>&#9658;</button>
      </div>
    </div>
  );
}

export default Chat;
