export default function loading() {
  return (
    <div className="flex space-x-2">
      <div className="w-2 h-2 bg-gray-200 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
      <div className="w-2 h-2 bg-gray-200 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
      <div className="w-2 h-2 bg-gray-200 rounded-full animate-bounce"></div>
    </div>
  );
}
