import axios from "axios";
import type {
  DashboardData,
  PlannerData,
  AssignmentsData,
  Assignment,
  CreateAssignmentPayload,
  UpdateAssignmentPayload,
  ChatData,
  SendMessagePayload,
  SendMessageResponse,
} from "@/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

const client = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 10000,
});

// ── Dashboard ──────────────────────────────────────────────────────────────────
export const getDashboard = async (): Promise<DashboardData> => {
  const { data } = await client.get<DashboardData>("/dashboard");
  return data;
};

// ── Planner ────────────────────────────────────────────────────────────────────
export const getPlanner = async (): Promise<PlannerData> => {
  const { data } = await client.get<PlannerData>("/planner");
  return data;
};

// ── Assignments ────────────────────────────────────────────────────────────────
export const getAssignments = async (): Promise<AssignmentsData> => {
  const { data } = await client.get<AssignmentsData>("/assignments");
  return data;
};

export const createAssignment = async (payload: CreateAssignmentPayload): Promise<Assignment> => {
  const { data } = await client.post<Assignment>("/assignments", payload);
  return data;
};

export const updateAssignment = async (id: string, payload: UpdateAssignmentPayload): Promise<Assignment> => {
  const { data } = await client.put<Assignment>(`/assignments/${id}`, payload);
  return data;
};

export const deleteAssignment = async (id: string): Promise<void> => {
  await client.delete(`/assignments/${id}`);
};

// ── Chat ───────────────────────────────────────────────────────────────────────
export const getChatHistory = async (): Promise<ChatData> => {
  const { data } = await client.get<ChatData>("/chat");
  return data;
};

export const sendChatMessage = async (payload: SendMessagePayload): Promise<SendMessageResponse> => {
  const { data } = await client.post<SendMessageResponse>("/chat/message", payload);
  return data;
};
