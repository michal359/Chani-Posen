import React, { useEffect, useRef, useState } from "react";
import { serverRequests } from "../Api";
import {
    Box,
    Paper,
    Typography,
    TextField,
    IconButton,
    CircularProgress,
    Avatar,
    Chip,
    Button
} from "@mui/material";

import SendIcon from "@mui/icons-material/Send";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import PersonIcon from "@mui/icons-material/Person";
import ReactMarkdown from "react-markdown";


export default function AiAssistant() {

    const [question, setQuestion] = useState("");
    const [loading, setLoading] = useState(false);

    const [messages, setMessages] = useState([
        {
            role: "assistant",
            text: "שלום 👋 אני העוזר החכם של הקליניקה. אפשר לשאול אותי על לקוחות, טיפולים, רכישות והמלצות."
        }
    ]);

    const [conversations, setConversations] = useState([]);

    const [conversationId, setConversationId] = useState(
        () => crypto.randomUUID()
    );

    const messagesEndRef = useRef(null);


    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({
            behavior: "smooth"
        });
    }, [messages, loading]);

    useEffect(() => {
        loadConversations();
    }, []);

    const loadConversations = () => {
        serverRequests(
            "GET",
            "ai/conversations"
        )
            .then(response => response.json())
            .then(data => {
                if (data.status === "ok") {
                    setConversations(data.conversations);
                }
            })
            .catch(error => {
                console.error(
                    "Failed loading conversations:",
                    error
                );
            });
    };

    const openConversation = (conversation) => {
        serverRequests(
            "GET",
            `ai/conversations/${conversation.conversation_id}/messages`
        )
            .then(response => response.json())
            .then(data => {
                if (data.status !== "ok") {
                    return;
                }

                setConversationId(
                    conversation.conversation_id
                );

                const loadedMessages = data.messages.map(
                    message => ({
                        role: message.role,
                        text: message.message_text
                    })
                );

                setMessages(loadedMessages);
            })
            .catch(error => {
                console.error(
                    "Failed opening conversation:",
                    error
                );
            });
    };

    const startNewConversation = () => {
        setConversationId(
            crypto.randomUUID()
        );

        setMessages([
            {
                role: "assistant",
                text: "שלום! איך אפשר לעזור?"
            }
        ]);
    };


    const sendQuestion = (customQuestion = null) => {
        const text = (customQuestion || question).trim();

        if (!text || loading) {
            return;
        }

        setMessages(prev => [
            ...prev,
            {
                role: "user",
                text: text
            }
        ]);

        setQuestion("");
        setLoading(true);

        const url = "ai/agent";

        serverRequests(
            "POST",
            url,
            {
                question: text,
                conversation_id: conversationId
            }
        )
            .then(response => {

                if (!response.ok) {
                    throw new Error("Server request failed");
                }

                return response.json();
            })
            .then(data => {

                console.log("AI response:", data);

                if (data.status !== "ok") {
                    throw new Error(
                        data.error ||
                        data.message ||
                        "AI request failed"
                    );
                }

                setMessages(prev => [
                    ...prev,
                    {
                        role: "assistant",
                        text: data.answer
                    }
                ]);

                // Refresh conversation list
                loadConversations();
            })
            .catch(error => {

                console.error("AI assistant error:", error);

                setMessages(prev => [
                    ...prev,
                    {
                        role: "assistant",
                        text: "לא הצלחתי לענות כרגע. אפשר לנסות שוב בעוד רגע."
                    }
                ]);
            })
            .finally(() => {
                setLoading(false);
            });
    };


    const handleKeyDown = (event) => {

        if (
            event.key === "Enter" &&
            !event.shiftKey
        ) {
            event.preventDefault();
            sendQuestion();
        }
    };


    return (

        <Box
            sx={{
                direction: "rtl",
                maxWidth: "1250px",
                mx: "auto",
                px: 3,
                py: 2
            }}
        >

            {/* כותרת */}
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    mb: 3
                }}
            >

                <Avatar
                    sx={{
                        width: 46,
                        height: 46
                    }}
                >
                    <SmartToyIcon />
                </Avatar>

                <Box>
                    <Typography
                        variant="h5"
                        fontWeight="bold"
                    >
                        עוזר AI
                    </Typography>

                    <Typography
                        variant="body2"
                        color="text.secondary"
                    >
                        מידע חכם מתוך מערכת ניהול הקליניקה
                    </Typography>
                </Box>

            </Box>


            {/* אזור ראשי: היסטוריה + צ'אט */}
            <Box
                sx={{
                    display: "flex",
                    gap: 2,
                    direction: "ltr"
                }}
            >

                {/* ========================================= */}
                {/* היסטוריית שיחות - צד שמאל */}
                {/* ========================================= */}

                <Paper
                    elevation={1}
                    sx={{
                        width: 260,
                        height: "68vh",
                        minHeight: 500,
                        flexShrink: 0,
                        borderRadius: 3,
                        overflow: "hidden",
                        display: "flex",
                        flexDirection: "column",
                        direction: "rtl"
                    }}
                >

                    {/* כותרת היסטוריה */}
                    <Box
                        sx={{
                            p: 2,
                            borderBottom: "1px solid #e0e0e0"
                        }}
                    >

                        <Button
                            fullWidth
                            variant="contained"
                            onClick={startNewConversation}
                            sx={{
                                mb: 2,
                                borderRadius: 2
                            }}
                        >
                            + שיחה חדשה
                        </Button>


                        <Typography
                            variant="subtitle2"
                            fontWeight="bold"
                            color="text.secondary"
                        >
                            שיחות קודמות
                        </Typography>

                    </Box>


                    {/* רשימת שיחות */}
                    <Box
                        sx={{
                            flex: 1,
                            overflowY: "auto",
                            p: 1
                        }}
                    >

                        {conversations.length === 0 && (

                            <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{
                                    textAlign: "center",
                                    mt: 3
                                }}
                            >
                                עדיין אין שיחות קודמות
                            </Typography>

                        )}


                        {conversations.map(conversation => (

                            <Box
                                key={conversation.conversation_id}
                                onClick={() =>
                                    openConversation(conversation)
                                }
                                sx={{
                                    p: 1.5,
                                    mb: 0.5,
                                    borderRadius: 2,
                                    cursor: "pointer",

                                    backgroundColor:
                                        conversation.conversation_id ===
                                            conversationId
                                            ? "#eeeeee"
                                            : "transparent",

                                    "&:hover": {
                                        backgroundColor: "#f3f3f3"
                                    }
                                }}
                            >

                                <Typography
                                    variant="body2"
                                    fontWeight={
                                        conversation.conversation_id ===
                                            conversationId
                                            ? "bold"
                                            : "normal"
                                    }
                                    noWrap
                                >
                                    {conversation.title}
                                </Typography>


                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                >
                                    {new Date(
                                        conversation.updated_at
                                    ).toLocaleDateString("he-IL")}
                                </Typography>

                            </Box>

                        ))}

                    </Box>

                </Paper>


                {/* ========================================= */}
                {/* הצ'אט */}
                {/* ========================================= */}

                <Paper
                    elevation={2}
                    sx={{
                        flex: 1,
                        minWidth: 0,
                        height: "68vh",
                        minHeight: 500,
                        display: "flex",
                        flexDirection: "column",
                        overflow: "hidden",
                        borderRadius: 3,
                        direction: "rtl"
                    }}
                >

                    {/* אזור ההודעות */}
                    <Box
                        sx={{
                            flex: 1,
                            overflowY: "auto",
                            p: 3,
                            backgroundColor: "#f7f7f7"
                        }}
                    >

                        {messages.map((message, index) => (

                            <Box
                                key={index}
                                sx={{
                                    display: "flex",
                                    justifyContent:
                                        message.role === "user"
                                            ? "flex-start"
                                            : "flex-end",
                                    mb: 2
                                }}
                            >

                                <Box
                                    sx={{
                                        display: "flex",
                                        gap: 1,
                                        maxWidth: "80%",
                                        alignItems: "flex-start",

                                        flexDirection:
                                            message.role === "user"
                                                ? "row"
                                                : "row-reverse"
                                    }}
                                >

                                    <Avatar
                                        sx={{
                                            width: 34,
                                            height: 34
                                        }}
                                    >
                                        {
                                            message.role === "user"
                                                ? <PersonIcon />
                                                : <SmartToyIcon />
                                        }
                                    </Avatar>


                                    <Paper
                                        elevation={1}
                                        sx={{
                                            p: 2,
                                            borderRadius: 3,

                                            backgroundColor:
                                                message.role === "user"
                                                    ? "#e7e7e7"
                                                    : "#ffffff"
                                        }}
                                    >

                                        <Box
                                            sx={{
                                                lineHeight: 1.8,

                                                "& p": {
                                                    margin: 0
                                                },

                                                "& ul": {
                                                    margin: "8px 0",
                                                    paddingRight: "20px"
                                                },

                                                "& ol": {
                                                    margin: "8px 0",
                                                    paddingRight: "20px"
                                                }
                                            }}
                                        >

                                            <ReactMarkdown>
                                                {message.text}
                                            </ReactMarkdown>

                                        </Box>

                                    </Paper>

                                </Box>

                            </Box>

                        ))}


                        {/* טעינה */}
                        {loading && (

                            <Box
                                sx={{
                                    display: "flex",
                                    justifyContent: "flex-end",
                                    alignItems: "center",
                                    gap: 1,
                                    mt: 1
                                }}
                            >

                                <CircularProgress size={20} />

                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                >
                                    בודק את הנתונים...
                                </Typography>

                            </Box>

                        )}


                        <div ref={messagesEndRef} />

                    </Box>


                    {/* ========================================= */}
                    {/* הצעות לשאלות */}
                    {/* ========================================= */}

                    {messages.length === 1 && (

                        <Box
                            sx={{
                                px: 2,
                                pt: 1,
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 1,
                                backgroundColor: "#fff"
                            }}
                        >

                            <Chip
                                label="מה הטיפול האחרון של שרה לוי?"
                                onClick={() =>
                                    sendQuestion(
                                        "מה הטיפול האחרון של שרה לוי?"
                                    )
                                }
                                clickable
                            />

                            <Chip
                                label="אילו מוצרים הומלצו לשרה לוי?"
                                onClick={() =>
                                    sendQuestion(
                                        "אילו מוצרים הומלצו לשרה לוי?"
                                    )
                                }
                                clickable
                            />

                            <Chip
                                label="האם יש לשרה לוי דברים שלא שולמו?"
                                onClick={() =>
                                    sendQuestion(
                                        "האם יש לשרה לוי טיפולים או רכישות שלא שולמו?"
                                    )
                                }
                                clickable
                            />

                        </Box>

                    )}


                    {/* ========================================= */}
                    {/* שורת כתיבה */}
                    {/* ========================================= */}

                    <Box
                        sx={{
                            p: 2,
                            display: "flex",
                            gap: 1,
                            alignItems: "flex-end",
                            backgroundColor: "#fff",
                            borderTop: "1px solid #ddd"
                        }}
                    >

                        <TextField
                            fullWidth
                            multiline
                            maxRows={4}
                            value={question}
                            disabled={loading}
                            onChange={(event) =>
                                setQuestion(event.target.value)
                            }
                            onKeyDown={handleKeyDown}
                            placeholder="שאל אותי משהו על לקוח..."
                        />


                        <IconButton
                            onClick={() => sendQuestion()}
                            disabled={
                                loading ||
                                !question.trim()
                            }
                            sx={{
                                width: 48,
                                height: 48
                            }}
                        >

                            <SendIcon />

                        </IconButton>

                    </Box>

                </Paper>

            </Box>

        </Box>
    );
}