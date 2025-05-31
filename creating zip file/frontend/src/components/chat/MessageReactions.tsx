import React from 'react';
import { useAuthStore } from '../../stores/authStore';

interface Reaction {
  user_id: string;
  reaction: string;
}

interface MessageReactionsProps {
  messageId: string;
  reactions: Reaction[];
  onAddReaction: (messageId: string, reaction: string) => void;
  onRemoveReaction: (messageId: string, reaction: string) => void;
}

const AVAILABLE_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '😡'];

const MessageReactions: React.FC<MessageReactionsProps> = ({
  messageId,
  reactions,
  onAddReaction,
  onRemoveReaction
}) => {
  const { user } = useAuthStore();
  const [showReactionPicker, setShowReactionPicker] = React.useState(false);

  const reactionCounts = reactions.reduce((acc, { reaction }) => {
    acc[reaction] = (acc[reaction] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const userReactions = reactions
    .filter((r) => r.user_id === user?.id)
    .map((r) => r.reaction);

  const handleReactionClick = (reaction: string) => {
    if (userReactions.includes(reaction)) {
      onRemoveReaction(messageId, reaction);
    } else {
      onAddReaction(messageId, reaction);
    }
    setShowReactionPicker(false);
  };

  return (
    <div className="relative flex items-center space-x-1">
      {Object.entries(reactionCounts).map(([reaction, count]) => (
        <button
          key={reaction}
          onClick={() => handleReactionClick(reaction)}
          className={`px-2 py-1 text-xs rounded-full ${
            userReactions.includes(reaction)
              ? 'bg-indigo-100 text-indigo-700'
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          {reaction} {count}
        </button>
      ))}
      
      <div className="relative">
        <button
          onClick={() => setShowReactionPicker(!showReactionPicker)}
          className="p-1 text-gray-500 hover:text-gray-700"
        >
          😊
        </button>
        
        {showReactionPicker && (
          <div className="absolute bottom-full left-0 mb-2 p-2 bg-white rounded-lg shadow-lg border">
            <div className="flex space-x-2">
              {AVAILABLE_REACTIONS.map((reaction) => (
                <button
                  key={reaction}
                  onClick={() => handleReactionClick(reaction)}
                  className="hover:bg-gray-100 p-1 rounded"
                >
                  {reaction}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageReactions; 