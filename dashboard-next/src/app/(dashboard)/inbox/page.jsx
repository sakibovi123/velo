import ChatList from "@/components/inbox/ChatList";
import ConversationView from "@/components/inbox/ConversationView";
import UserDetails from "@/components/inbox/UserDetails";

export default function InboxPage() {
  return (
    <div className="flex h-full overflow-hidden">
      <ChatList />
      <ConversationView />
      <UserDetails />
    </div>
  );
}
