interface ErrorMessageProps {
  message: string;
  className?: string;
}

const ErrorMessage = ({ message, className = '' }: ErrorMessageProps) => {
  if (!message) return null;

  return (
    <div className={`text-sm text-red-600 ${className}`}>
      {message}
    </div>
  );
};

export default ErrorMessage; 