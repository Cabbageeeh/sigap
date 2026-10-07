export interface SchoolConversation {
  id: string;
  student_id: string;
  parent_user_id: string;
  teacher_user_id: string;
  topic: string;
  title: string;
  status: 'open' | 'closed';
  parent_read_at: number;
  teacher_read_at: number;
  created_at: number;
  updated_at: number;
  student_name: string;
  class_name: string;
  parent_name: string;
  teacher_name: string;
  unread: number;
}
export interface SchoolMessage {
  id: string;
  conversation_id: string;
  sender_user_id: string;
  sender_name: string;
  body: string;
  created_at: number;
}
export interface SchoolContact {
  student_id: string;
  student_name: string;
  class_name: string;
  teacher_user_id: string;
  teacher_name: string;
  teaching: string;
}
export interface SchoolMessageReport {
  id: string;
  reason: string;
  status: string;
  body: string;
  sender_user_id: string;
  sender_name: string;
  reporter_name: string;
  student_name: string;
  created_at: number;
}
