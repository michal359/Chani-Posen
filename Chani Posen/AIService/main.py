import requests
from google.genai import types
import os
from pathlib import Path

from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional, List
from dotenv import load_dotenv
from google import genai
import json
import time
from datetime import date

env_path = Path(__file__).resolve().parent.parent / ".env"

print("ENV path:", env_path)
print("ENV exists:", env_path.exists())

load_dotenv(env_path, override=True)

gemini_api_key = os.getenv("GEMINI_API_KEY")

print("Gemini key loaded:", bool(gemini_api_key))

gemini_client = genai.Client(
    api_key=gemini_api_key
)

GEMINI_MODEL = os.getenv(
    "GEMINI_MODEL",
    "gemini-3.5-flash"
)

print("Gemini model:", GEMINI_MODEL)

app = FastAPI()


class ClientData(BaseModel):
    client_id: int
    username: str
    first_name: str
    last_name: str
    email: str
    phone: Optional[str] = None
    birth_date: Optional[str] = None
    treatment_status: Optional[str] = None
    skin_type: Optional[str] = None
    is_verified: Optional[bool] = None

class HistoryMessage(BaseModel):
    role: str
    text: str

class AgentRequest(BaseModel):
    question: str
    conversation_id: str
    history: Optional[List[HistoryMessage]] = None

class TreatmentData(BaseModel):
    treatment_id: int
    treatment_type: Optional[str] = None
    treatment_date: Optional[str] = None
    duration: Optional[int] = None
    summary: Optional[str] = None
    status: Optional[str] = None
    amount: Optional[float] = None


class PurchaseData(BaseModel):
    purchase_id: int
    product_id: int
    product_name: Optional[str] = None
    purchase_date: Optional[str] = None
    status: Optional[str] = None


class RecommendationData(BaseModel):
    recommendation_id: int
    product_id: int
    product_name: Optional[str] = None
    created_at: Optional[str] = None


class ClientContext(BaseModel):
    client: ClientData
    treatments: List[TreatmentData] = []
    purchases: List[PurchaseData] = []
    recommendations: List[RecommendationData] = []

def get_client(client_id: int) -> dict:
    """
    Gets basic information about a client from the customer management system.

    Args:
        client_id: The numeric ID of the client.

    Returns:
        The client's basic profile information.
    """
    print(f"🔧 TOOL CALLED: get_client({client_id})")

    response = requests.get(
        f"http://127.0.0.1:3000/ai/tools/client/{client_id}",
        timeout=5
    )

    response.raise_for_status()

    return response.json()

def search_client(name: str) -> dict:
    """
    Searches for clients by first name, last name or full name.

    Args:
        name: The client's name or part of the client's name.

    Returns:
        Matching clients with their internal client IDs.
    """

    print(f"🔧 TOOL CALLED: search_client({name})")

    response = requests.get(
        "http://127.0.0.1:3000/ai/tools/clients/search",
        params={"name": name},
        timeout=5
    )

    response.raise_for_status()

    return response.json()

def get_treatments(client_id: int) -> dict:
    """
    Gets the treatment history of a client.

    Args:
        client_id: The numeric ID of the client.

    Returns:
        The client's treatment history.
    """
    print(f"🔧 TOOL CALLED: get_treatments({client_id})")
    response = requests.get(
        f"http://127.0.0.1:3000/ai/tools/client/{client_id}/treatments",
        timeout=5
    )

    response.raise_for_status()

    return response.json()

def get_purchases(client_id: int) -> dict:
    """
    Gets the purchase history of a client.

    Args:
        client_id: The numeric ID of the client.

    Returns:
        The client's purchase history.
    """

    print(f"🔧 TOOL CALLED: get_purchases({client_id})")

    response = requests.get(
        f"http://127.0.0.1:3000/ai/tools/client/{client_id}/purchases",
        timeout=5
    )

    response.raise_for_status()

    return response.json()


def get_recommendations(client_id: int) -> dict:
    """
    Gets product recommendations assigned to a client.

    Args:
        client_id: The numeric ID of the client.

    Returns:
        The client's product recommendations.
    """

    print(f"🔧 TOOL CALLED: get_recommendations({client_id})")

    response = requests.get(
        f"http://127.0.0.1:3000/ai/tools/client/{client_id}/recommendations",
        timeout=5
    )

    response.raise_for_status()

    return response.json()

def build_gemini_history(messages):
    normalized = []

    for message in messages or []:

        if message.role == "user":
            role = "user"

        elif message.role == "assistant":
            role = "model"

        else:
            continue

        if not normalized and role != "user":
            continue

        if (
            normalized and
            normalized[-1]["role"] == role
        ):
            normalized[-1]["text"] += (
                "\n" + message.text
            )

        else:
            normalized.append({
                "role": role,
                "text": message.text
            })

    return [
        types.Content(
            role=message["role"],
            parts=[
                types.Part(
                    text=message["text"]
                )
            ]
        )
        for message in normalized
    ]

def get_clinic_overview() -> dict:
    """
    Returns a general overview of the clinic,
    including number of clients and unpaid items.
    """
    print("🔧 TOOL CALLED: get_clinic_overview()")

    response = requests.get(
        "http://127.0.0.1:3000/ai/tools/clinic/overview",
        timeout=5
    )

    response.raise_for_status()
    return response.json()


def get_birthdays(month: Optional[int] = None) -> dict:
    """
    Returns clients whose birthday is in a given month.
    If no month is provided, returns birthdays
    for the current month.
    """
    print(
        f"🔧 TOOL CALLED: get_birthdays({month})"
    )

    params = {}

    if month is not None:
        params["month"] = month

    response = requests.get(
        "http://127.0.0.1:3000/ai/tools/clients/birthdays",
        params=params,
        timeout=5
    )

    response.raise_for_status()
    return response.json()


def get_unpaid_products() -> dict:
    """
    Returns unpaid product purchases and their total value.
    """
    print("🔧 TOOL CALLED: get_unpaid_products()")

    response = requests.get(
        "http://127.0.0.1:3000/ai/tools/finance/unpaid-products",
        timeout=5
    )

    response.raise_for_status()
    return response.json()


def get_client_financial_summary(client_id: int) -> dict:
    """
    Returns paid revenue and unpaid amounts
    for a specific client.
    """
    print(
        f"🔧 TOOL CALLED: "
        f"get_client_financial_summary({client_id})"
    )

    response = requests.get(
        f"http://127.0.0.1:3000/ai/tools/client/"
        f"{client_id}/financial-summary",
        timeout=5
    )

    response.raise_for_status()
    return response.json()


def get_client_contact(client_id: int) -> dict:
    """
    Returns contact information for a specific client,
    including phone, email and birth date.
    Use only when contact or personal information
    is actually relevant to the user's request.
    """
    print(
        f"🔧 TOOL CALLED: get_client_contact({client_id})"
    )

    response = requests.get(
        f"http://127.0.0.1:3000/ai/tools/client/"
        f"{client_id}/contact",
        timeout=5
    )

    response.raise_for_status()
    return response.json()


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "Chani Posen AI Agent"
    }


@app.post("/client-summary")
def client_summary(context: ClientContext):
    client = context.client

    total_treatments = len(context.treatments)
    total_purchases = len(context.purchases)
    total_recommendations = len(context.recommendations)

    latest_treatment = context.treatments[0] if total_treatments > 0 else None

    summary_text = (
        f"{client.first_name} {client.last_name} "
        f"has {total_treatments} treatments, "
        f"{total_purchases} purchases, and "
        f"{total_recommendations} recommendations."
    )

    if latest_treatment:
        summary_text += (
            f" Latest treatment: {latest_treatment.treatment_type} "
            f"on {latest_treatment.treatment_date}."
        )

    return {
        "status": "ok",
        "message": "Client context received successfully",
        "summary": {
            "client_name": f"{client.first_name} {client.last_name}",
            "skin_type": client.skin_type,
            "treatment_status": client.treatment_status,
            "total_treatments": total_treatments,
            "total_purchases": total_purchases,
            "total_recommendations": total_recommendations,
            "latest_treatment": latest_treatment,
            "summary_text": summary_text
        }
    }

@app.get("/gemini-test")
def gemini_test():
    try:
        response = gemini_client.models.generate_content(
            model=GEMINI_MODEL,
            contents="Reply with exactly: Gemini connection successful"
        )

        return {
            "status": "ok",
            "response": response.text
        }

    except Exception as e:
        print("GEMINI ERROR:", repr(e))

        return {
            "status": "error",
            "error": str(e)
        }



def generate_with_retry(prompt: str):
    last_error = None

    for attempt in range(2):
        try:
            return gemini_client.models.generate_content(
                model=GEMINI_MODEL,
                contents=prompt
            )

        except Exception as e:
            last_error = e

            print(
                f"Gemini attempt {attempt + 1} failed:",
                repr(e)
            )

            if "503" not in str(e):
                raise e

            if attempt == 0:
                time.sleep(1)

    raise last_error

@app.post("/client-ai-summary")
def client_ai_summary(context: ClientContext):
    try:
        safe_context = {
            "client": {
                "client_id": context.client.client_id,
                "first_name": context.client.first_name,
                "last_name": context.client.last_name,
                "skin_type": context.client.skin_type,
                "treatment_status": context.client.treatment_status
            },
            "treatments": [
                treatment.model_dump()
                for treatment in context.treatments
            ],
            "purchases": [
                purchase.model_dump()
                for purchase in context.purchases
            ],
            "recommendations": [
                recommendation.model_dump()
                for recommendation in context.recommendations
            ]
        }

        prompt = f"""
You are an AI assistant inside a customer management system.

Today's date is: {current_date}

Analyze the following client data and provide a short, useful summary
for the system administrator.

Important rules:
- Do not invent information.
- Only describe a date as future if it is later than today's date.
- Base conclusions only on the supplied data.

Focus on:
- treatment history
- recent activity
- purchases
- recommendations
- unpaid treatments or purchases
- important patterns worth noticing

Client data:
{json.dumps(safe_context, ensure_ascii=False, indent=2)}

Respond in Hebrew.
"""

        response = generate_with_retry(prompt)

        return {
            "status": "ok",
            "client_id": context.client.client_id,
            "ai_summary": response.text
        }

    except Exception as e:
        print("CLIENT AI SUMMARY ERROR:", repr(e))

        return {
            "status": "error",
            "error": str(e)
        }

@app.post("/agent")
def agent(request: AgentRequest):
    try:
        # Build the conversation history from MySQL data
        gemini_history = build_gemini_history(
            request.history
        )

        print(
            f"📚 HISTORY LOADED: "
            f"{len(gemini_history)} messages "
            f"for {request.conversation_id}"
        )
        current_date = date.today().isoformat()

        config = types.GenerateContentConfig(
            tools=[
                search_client,
                get_client,
                get_treatments,
                get_purchases,
                get_recommendations,
                get_clinic_overview,
                get_birthdays,
                get_unpaid_products,
                get_client_financial_summary,
                get_client_contact
            ],

            system_instruction=f"""
You are an AI assistant inside a clinic management system.

Today's date is {current_date}.

Important rules:

- Always use today's date above for age calculations, birthdays,
  relative dates and time periods.
- Always use the previous conversation history to understand context.
- If the user says "היא", "הוא", "אותה", "שלה", "לקוחה זו"
  or similar references, understand them as referring to the most
  recently discussed client when the context is clear.
- Do not ask for the client's name again when it is already clear
  from the conversation history.
- Use the available tools whenever factual database information is required.
- Before saying information is unavailable, check whether one or more tools
  can answer the question.
- Never invent client information.
- Answer in Hebrew.
- Do not expose internal client IDs unless explicitly requested.
- If there are multiple possible clients and the context is truly ambiguous,
  ask the user to clarify.
""",

            thinking_config=types.ThinkingConfig(
                thinking_level="minimal"
            )
        )

        # Create a chat using the history from the database
        chat = gemini_client.chats.create(
            model=GEMINI_MODEL,
            config=config,
            history=gemini_history
        )

        # Send only the new question
        response = chat.send_message(
            request.question
        )

        return {
            "status": "ok",
            "conversation_id": request.conversation_id,
            "answer": response.text
        }

    except Exception as e:
        print(
            "AGENT ERROR:",
            repr(e)
        )

        return {
            "status": "error",
            "error": str(e)
        }