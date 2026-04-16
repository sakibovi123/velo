import ChatList from "@/components/inbox/ChatList";
import ConversationView from "@/components/inbox/ConversationView";
import UserDetails from "@/components/inbox/UserDetails";

/**
 * Three-pane Inbox.
 * ┌──────────────┬──────────────────────────┬──────────────┐
 * │  Chat List   │   Active Conversation    │ User Details │
 * │  (w-72)      │   (flex-1)               │  (w-72)      │
 * └──────────────┴──────────────────────────┴──────────────┘
 */
export default function InboxPage() {
  return (
    <div className="flex h-full">
      <ChatList />
      <ConversationView />
      <UserDetails />
    </div>
  );
}
