import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Box,
  Grid,
  List,
  ListItem,
  ListItemText,
  Typography,
  TextField,
  Button,
  Divider,
  ButtonBase,
  Snackbar,
} from "@mui/material";
import Wrapper from '../../components/Wrapper';
import axios from "axios";
import * as StompJs from "@stomp/stompjs";
import { useRouter } from 'next/router';
import { WS_URL } from '../../constants/endpoints';

const ChatInterface = () => {
  const router = useRouter();
  const { roomId } = router.query;
  const [selectedChatRoom, setSelectedChatRoom] = useState(null);
  const [messageList, setMessageList] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [page, setPage] = useState(0);
  const [member, setMember] = useState(null);
  const [messageRoomList, setMessageRoomList] = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const [opponentNicknames, setOpponentNicknames] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '' });
  const client = useRef(null);
  const URL = WS_URL;

  const connect = useCallback(() => {
    console.log("Attempting to connect to WebSocket...");

    const token = localStorage.getItem('Authorization');
    client.current = new StompJs.Client({
      brokerURL: URL,
      connectHeaders: {
        Authorization: token ? (token.startsWith('Bearer ') ? token : `Bearer ${token}`) : '',
      },
      debug: (str) => console.log("STOMP: " + str),
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,

      onConnect: () => {
        console.log("WebSocket connection successful!");
        setIsConnected(true);
        if (selectedChatRoom) {
          subscribe(selectedChatRoom);
        }
      },

      onStompError: (frame) => {
        console.error("STOMP error:", frame.headers['message']);
        setIsConnected(false);
        setSnackbar({ open: true, message: 'STOMP 연결 오류가 발생했습니다.' });
      },

      onWebSocketClose: () => {
        console.log("WebSocket connection closed. Trying to reconnect...");
        setIsConnected(false);
        setSnackbar({ open: true, message: 'WebSocket 연결이 종료되었습니다. 재연결을 시도합니다.' });
        setTimeout(() => client.current.activate(), 5000);
      },

      onWebSocketError: (event) => {
        console.error("WebSocket error:", event);
        setIsConnected(false);
        setSnackbar({ open: true, message: 'WebSocket 오류가 발생했습니다.' });
      },
    });

    client.current.activate();
  }, [URL, selectedChatRoom]);

  const subscribe = useCallback((roomId) => {
    if (client.current && client.current.connected && roomId) {
      client.current.subscribe(`/sub/room/${roomId}`, (message) => {
        console.log("Received message:", message.body);
        const receivedMessage = JSON.parse(message.body);
        setMessageList(prevList => {
          if (!prevList.some(msg => msg.messageId === receivedMessage.messageId)) {
            return [...prevList, receivedMessage];
          }
          return prevList;
        });
      });
      console.log(`Subscribed to chat room ${roomId}`);
    } else {
      console.error("Cannot subscribe: client is not connected or roomId is null");
      setSnackbar({ open: true, message: '채팅방 구독에 실패했습니다.' });
    }
  }, []);

  useEffect(() => {
    if (roomId) {
      setSelectedChatRoom(Number(roomId));
    }
  }, [roomId]);

  useEffect(() => {
    const token = localStorage.getItem('Authorization');
    if (token) {
      axios.defaults.headers.common['Authorization'] = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    }
    fetchMessageRooms().then(fetchMemberInfo);
  }, [page]);

  useEffect(() => {
    if (selectedChatRoom) {
      fetchMembers(selectedChatRoom)
          .then(fetchAndSetMessages)
          .then(() => {
            if (client.current && client.current.connected) {
              subscribe(selectedChatRoom);
            } else {
              connect();
            }
          });
    }
    return () => {
      if (client.current) {
        client.current.deactivate();
      }
    };
  }, [selectedChatRoom, connect, subscribe]);

  useEffect(() => {
    const messageContainer = document.getElementById('message-container');
    if (messageContainer) {
      messageContainer.scrollTop = messageContainer.scrollHeight;
    }
  }, [messageList]);

  const fetchMessageRooms = () => {
    return axios.get(`/api/messages/member?page=${page}`)
        .then(response => {
          setTotalPages(response.data.totalPages);
          setMessageRoomList(response.data.data);
        })
        .catch(error => {
          console.error("메시지 방 목록 요청 실패:", error);
          setSnackbar({ open: true, message: '메시지 방 목록을 불러오는데 실패했습니다.' });
        });
  };

  const fetchMemberInfo = () => {
    return axios.get('/api/members/my')
        .then(response => {
          setMember(response.data.data);
        })
        .catch(error => {
          console.error('회원 정보 요청 실패:', error);
          setSnackbar({ open: true, message: '회원 정보를 불러오는데 실패했습니다.' });
        });
  };

  const fetchMembers = (roomId) => {
    return axios.get(`/api/messages/room/${roomId}/members`)
        .then(response => {
          const otherMember = response.data.find(m => m.id !== member?.id);
          setOpponentNicknames(otherMember ? otherMember.nickname : "Unknown User");
        })
        .catch(err => {
          console.error("채팅방 멤버 정보 요청 실패:", err);
          setOpponentNicknames("Unknown User");
          setSnackbar({ open: true, message: '채팅방 멤버 정보를 불러오는데 실패했습니다.' });
        });
  };

  const fetchAndSetMessages = () => {
    if (selectedChatRoom !== null) {
      return axios.get(`/api/messages/rooms/member/${selectedChatRoom}`)
          .then(response => {
            const messages = response.data.data.messages;
            setMessageList(messages.reverse());
          })
          .catch(error => {
            console.error('메시지 조회 실패:', error);
            setSnackbar({ open: true, message: '메시지를 불러오는데 실패했습니다.' });
          });
    }
    return Promise.resolve();
  };

  const handleChatRoomClick = useCallback((chatRoomId, isOtherUser) => {
    setSelectedChatRoom(chatRoomId);
    setOpponentNicknames(isOtherUser);
  }, []);

  const handleSendMessage = useCallback(() => {
    if (newMessage.trim() !== "") {
      publish();
    }
  }, [newMessage]);

  const publish = () => {
    if (!client.current || !client.current.connected) {
      console.log("WebSocket is not connected. Trying to reconnect...");
      connect();
      return;
    }

    const token = localStorage.getItem('Authorization');
    const message = {
      memberId: member.id,
      messageRoomId: selectedChatRoom,
      messageContent: newMessage,
    };

    // 즉시 메시지 목록에 추가
    const newMessageObject = {
      messageId: Date.now(),
      member: { id: member.id, nickname: member.nickname },
      messageContent: newMessage,
      createdAt: new Date().toISOString()
    };
    setMessageList(prevList => [...prevList, newMessageObject]);

    try {
      client.current.publish({
        destination: `/pub/chats/${selectedChatRoom}`,
        body: JSON.stringify(message),
        headers: { Authorization: token ? (token.startsWith('Bearer ') ? token : `Bearer ${token}`) : '' },
      });
      console.log("Message sent successfully:", newMessage);
      setNewMessage("");
    } catch (error) {
      console.error("Failed to send message:", error);
      setSnackbar({ open: true, message: '메시지 전송에 실패했습니다. 다시 시도해주세요.' });
      // 메시지 전송 실패 시 추가했던 메시지 제거
      setMessageList(prevList => prevList.filter(msg => msg.messageId !== newMessageObject.messageId));
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Unknown Date";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid Date";
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
      <Wrapper>
        <Box sx={{ flexGrow: 1, p: 2, maxWidth: "60%", margin: "0 auto", minHeight: "80vh" }}>
          <Grid container spacing={2} sx={{ height: "955px" }}>
            {/* Chat room list */}
            <Grid item xs={12} md={4} sx={{ height: "100%" }}>
              <Box sx={{ border: "1px solid #e0e0e0", borderRadius: "8px", height: "100%", overflowY: "auto" }}>
                <Typography variant="h6" sx={{ p: 2 }}>
                  {member?.nickname || "Loading..."}
                </Typography>
                <Divider />
                <List>
                  {messageRoomList.map((chatRoom) => {
                    let otherUserNickname = null;
                    chatRoom.messages.forEach((message) => {
                      if (message.member.nickname !== member?.nickname) {
                        otherUserNickname = message.member.nickname;
                      }
                    });

                    return (
                        <React.Fragment key={chatRoom.messageRoomId}>
                          <ListItem
                              component={ButtonBase}
                              onClick={() => handleChatRoomClick(chatRoom.messageRoomId, otherUserNickname)}
                              sx={{
                                backgroundColor: selectedChatRoom === chatRoom.messageRoomId ? "#e0f7fa" : "inherit",
                              }}
                          >
                            <ListItemText
                                primary={otherUserNickname || 'Unknown User'}
                                secondary={formatDate(chatRoom.lastMessageAt)}
                            />
                          </ListItem>
                        </React.Fragment>
                    );
                  })}
                </List>
              </Box>
            </Grid>

            {/* Chat messages */}
            <Grid item xs={12} md={8} sx={{ height: "100%" }}>
              {selectedChatRoom ? (
                  <Box sx={{ border: "1px solid #e0e0e0", borderRadius: "8px", height: "100%", display: "flex", flexDirection: "column" }}>
                    <Box sx={{ display: "flex", alignItems: "center", p: 2 }}>
                      <Box sx={{ ml: 2 }}>
                        <Typography variant="h6">{opponentNicknames || "Unknown"}</Typography>
                      </Box>
                    </Box>
                    <Divider />
                    <Box id="message-container" sx={{ flexGrow: 1, overflowY: "auto", p: 2 }}>
                      {messageList.map((msg) => {
                        const isOtherUser = msg.member.id !== member?.id;
                        return (
                            <Box key={msg.messageId} sx={{ mb: 3 }}>
                              <Box sx={{ display: "flex", justifyContent: !isOtherUser ? "flex-end" : "flex-start" }}>
                                <Box sx={{
                                  backgroundColor: !isOtherUser ? "#ffcc80" : "#f0f0f0",
                                  color: "#000",
                                  padding: "8px 12px",
                                  borderRadius: "16px",
                                  maxWidth: "60%",
                                }}>
                                  <Typography variant="body1">{msg.messageContent}</Typography>
                                </Box>
                              </Box>
                              <Typography variant="caption" sx={{
                                display: "block",
                                textAlign: !isOtherUser ? "right" : "left",
                                color: "#888",
                              }}>
                                {formatDate(msg.createdAt)}
                              </Typography>
                            </Box>
                        )
                      })}
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", borderTop: "1px solid #e0e0e0", padding: 1 }}>
                      <TextField
                          fullWidth
                          variant="outlined"
                          placeholder="메시지를 입력하세요..."
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          sx={{ mr: 1 }}
                      />
                      <Button
                          variant="contained"
                          color="primary"
                          onClick={handleSendMessage}
                          disabled={!isConnected}
                      >
                        전송
                      </Button>
                    </Box>
                  </Box>
              ) : (
                  <Typography variant="body1">대화방을 선택하세요.</Typography>
              )}
            </Grid>
          </Grid>
        </Box>
        <Snackbar
            open={snackbar.open}
            autoHideDuration={6000}
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            message={snackbar.message}
        />
      </Wrapper>
  );
};

export default ChatInterface;