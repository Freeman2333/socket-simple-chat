import React, { useEffect, useRef, useState } from "react";
import ScrollToBottom from "react-scroll-to-bottom";
import Peer from "simple-peer/simplepeer.min.js";

function Chat({ socket, username, room }) {
  const [currentMessage, setCurrentMessage] = useState("");
  const [messageList, setMessageList] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [showMyVideo, setShowMyVideo] = useState(false);
  const [myCurrentStream, setMyCurrentStream] = useState(null);
  const [userCurrentStream, setUserCurrentStream] = useState(null);
  const [receivingCall, setReceivingCall] = useState(false);
  const [callerId, setCallerId] = useState("");
  const [callerName, setcallerName] = useState("");
  const [callerSignal, setCallerSignal] = useState();
  const [callAccepted, setCallAccepted] = useState(false);

  const myVideo = useRef(null);
  const userVideo = useRef(null);
  const connectionRef = useRef(null);

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

  const handleCallUser = async (userToCallId) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    setMyCurrentStream(stream);
    setShowMyVideo(true);

    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream,
    });

    peer.on("signal", (data) => {
      socket.emit("callUser", {
        userToCall: userToCallId,
        signalData: data,
        from: socket.id,
        name: username,
      });
    });

    peer.on("stream", (remoteStream) => {
      console.log({ remoteStream });

      setUserCurrentStream(remoteStream);
    });

    peer.on("error", (e) => {
      console.log({ e });
    });

    socket.on("callAccepted", (signal) => {
      setCallAccepted(true);
      peer.signal(signal);
    });

    connectionRef.current = peer;
  };

  const answerCall = async () => {
    const currentStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    setMyCurrentStream(currentStream);
    setShowMyVideo(true);
    setCallAccepted(true);

    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: currentStream,
    });

    peer.on("signal", (data) => {
      socket.emit("answerCall", { signal: data, to: callerId });
    });

    peer.on("error", (e) => {
      console.log({ e });
    });

    peer.on("stream", (stream) => {
      console.log({ stream });

      setUserCurrentStream(stream);
    });

    peer.signal(callerSignal);
    connectionRef.current = peer;
    setReceivingCall(false);
  };

  const leaveCall = () => {
    myVideo.current.srcObject?.getTracks().forEach((track) => track.stop());
    userVideo.current.srcObject?.getTracks().forEach((track) => track.stop());
    setCallAccepted(false);
    setMyCurrentStream(null);
    setUserCurrentStream(null);
    setShowMyVideo(false);
    connectionRef.current.destroy();
    connectionRef.current = null;
  };

  useEffect(() => {
    socket.on("receive_message", (data) => {
      setMessageList((list) => [...list, data]);
    });

    socket.on("onlineUsers", (users) => {
      setOnlineUsers(users);
    });

    socket.on("callUser", (data) => {
      setReceivingCall(true);
      setCallerId(data.from);
      setcallerName(data.name);
      setCallerSignal(data.signal);
    });

    return () => {
      socket.off("receive_message");
      socket.off("onlineUsers");
      socket.off("callUser");
      socket.off("callAccepted");

      connectionRef.current.destroy();
    };
  }, [socket]);

  useEffect(() => {
    if (myVideo.current && myCurrentStream) {
      myVideo.current.srcObject = myCurrentStream;
    }
  }, [myCurrentStream]);

  useEffect(() => {
    if (userVideo.current && userCurrentStream) {
      userVideo.current.srcObject = userCurrentStream;
    }
  }, [userCurrentStream]);

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
                  {user.id !== socket.id && (
                    <button
                      className="phone-call-button"
                      onClick={() => handleCallUser(user.id)}
                      title={`Call ${user.username}`}
                    >
                      📞
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
      {callAccepted && (
        <button className="button" onClick={() => leaveCall()}>
          Leave Call
        </button>
      )}
      {showMyVideo && (
        <video
          playsInline
          muted
          ref={myVideo}
          autoPlay
          style={{ width: "300px" }}
        />
      )}
      {callAccepted ? (
        <video
          playsInline
          muted
          ref={userVideo}
          autoPlay
          style={{ width: "300px" }}
        />
      ) : (
        <>
          {receivingCall && !callAccepted ? (
            <div className="caller">
              <h1>{callerName} is calling...</h1>
              <button onClick={() => answerCall()}>Answer</button>
            </div>
          ) : null}

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
        </>
      )}
    </div>
  );
}

export default Chat;
