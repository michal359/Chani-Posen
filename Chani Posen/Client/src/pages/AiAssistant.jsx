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
    Chip
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

    const messagesEndRef = useRef(null);


    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({
            behavior: "smooth"
        });
    }, [messages, loading]);


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
                question: text
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
                maxWidth: "950px",
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


            <Paper
                elevation={2}
                sx={{
                    height: "68vh",
                    minHeight: 500,
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                    borderRadius: 3
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


                {/* הצעות לשאלות */}
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


                {/* שורת כתיבה */}
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
    );
}