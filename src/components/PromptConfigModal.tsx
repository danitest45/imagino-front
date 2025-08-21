'use client';

type Props = {
  onSelect: (res: { width: number; height: number }) => void;
  onClose: () => void;
};

export default function PromptConfigModal({ onSelect, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-4">
      <div className="bg-gray-900 rounded-xl p-6 w-full max-w-sm shadow-xl">
        <h2 className="text-white text-lg font-semibold mb-4">Choose resolution</h2>
        <div className="space-y-2">
          <button
            onClick={() => {
              onSelect({ width: 1024, height: 1024 });
              onClose();
            }}
            className="w-full py-2 px-4 bg-gray-800 hover:bg-purple-600 rounded-lg text-white text-sm"
          >
            🟪 Square (1:1)
          </button>
          <button
            onClick={() => {
              onSelect({ width: 768, height: 1152 });
              onClose();
            }}
            className="w-full py-2 px-4 bg-gray-800 hover:bg-purple-600 rounded-lg text-white text-sm"
          >
            📱 Vertical (2:3)
          </button>
          <button
            onClick={() => {
              onSelect({ width: 1152, height: 768 });
              onClose();
            }}
            className="w-full py-2 px-4 bg-gray-800 hover:bg-purple-600 rounded-lg text-white text-sm"
          >
            🖼️ Horizontal (3:2)
          </button>
        </div>
      </div>
    </div>
  );
}
