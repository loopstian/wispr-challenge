import React, { useState, useEffect } from 'react';
import { X, Upload, Trash2, Check } from 'lucide-react';
import { THEME } from '../constants';

interface EditModalProps {
  isOpen: boolean;
  initialLabel: string;
  initialImage?: string;
  initialColor?: string;
  onClose: () => void;
  onSave: (label: string, image?: string, color?: string) => void;
  onDelete?: () => void;
  isRoot: boolean;
}

const EditModal: React.FC<EditModalProps> = ({ 
  isOpen, 
  initialLabel, 
  initialImage,
  initialColor,
  onClose, 
  onSave,
  onDelete,
  isRoot
}) => {
  const [label, setLabel] = useState(initialLabel);
  const [imageUrl, setImageUrl] = useState<string | undefined>(initialImage);
  const [selectedColor, setSelectedColor] = useState<string>(initialColor || '#ffffff');

  useEffect(() => {
    if (isOpen) {
      setLabel(initialLabel);
      setImageUrl(initialImage);
      setSelectedColor(initialColor || '#ffffff');
    }
  }, [isOpen, initialLabel, initialImage, initialColor]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-white border-4 border-black shadow-[8px_8px_0px_0px_#000]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b-4 border-black bg-black text-white">
          <h2 className="text-xl font-bold uppercase tracking-tighter">
            {isRoot ? 'Blueprint Core' : 'Memory Module'}
          </h2>
          <button onClick={onClose} className="hover:text-red-500 transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 text-black">
          
          {/* Label Input */}
          <div className="space-y-2">
            <label className="block text-sm font-bold uppercase text-black">Description / Memory</label>
            <textarea
              className="w-full h-32 p-3 text-lg font-mono text-black bg-white border-2 border-black focus:outline-none focus:ring-0 focus:border-blue-600 resize-none placeholder-gray-500"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Enter reason..."
            />
          </div>

          {/* Color Picker */}
          <div className="space-y-2">
            <label className="block text-sm font-bold uppercase text-black">Structure Color</label>
            <div className="flex flex-wrap gap-2">
              {THEME.colors.palette.map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`w-8 h-8 border-2 flex items-center justify-center transition-all ${selectedColor === color ? 'border-black scale-110 shadow-[2px_2px_0px_0px_#000]' : 'border-gray-300 hover:border-black'}`}
                  style={{ backgroundColor: color }}
                  title={color}
                >
                  {selectedColor === color && (
                    <Check size={14} color={color === '#000000' || color === '#0000ff' || color === '#ff0000' ? '#fff' : '#000'} />
                  )}
                </button>
              ))}
              <div className="relative w-8 h-8 border-2 border-black overflow-hidden flex items-center justify-center bg-gray-100 hover:bg-gray-200 cursor-pointer">
                 <input 
                    type="color" 
                    value={selectedColor} 
                    onChange={(e) => setSelectedColor(e.target.value)}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                 />
                 <div className="pointer-events-none w-4 h-4 rounded-full border border-black" style={{backgroundColor: selectedColor}}></div>
              </div>
            </div>
          </div>

          {/* Image Upload */}
          <div className="space-y-2">
            <label className="block text-sm font-bold uppercase text-black">Visual Data</label>
            <div className="flex items-center gap-4">
              <label className="flex items-center justify-center h-12 px-4 space-x-2 border-2 border-black cursor-pointer hover:bg-gray-100 active:bg-gray-200 transition-colors text-black bg-white">
                <Upload size={18} />
                <span className="text-sm font-bold">UPLOAD IMAGE</span>
                <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
              </label>
              {imageUrl && (
                <button 
                  onClick={() => setImageUrl(undefined)}
                  className="text-xs underline text-red-600 font-bold uppercase"
                >
                  Clear Image
                </button>
              )}
            </div>
            
            {imageUrl && (
              <div className="mt-4 w-full h-32 border-2 border-black overflow-hidden relative grayscale hover:grayscale-0 transition-all bg-white">
                 <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t-2 border-black">
            {!isRoot && onDelete && (
               <button 
               onClick={onDelete}
               className="flex items-center gap-2 px-4 py-2 text-red-600 border-2 border-transparent hover:border-red-600 transition-all font-bold"
             >
               <Trash2 size={18} />
               <span>DISMANTLE</span>
             </button>
            )}
            <div className={!isRoot && onDelete ? "" : "ml-auto"}>
              <button 
                onClick={() => onSave(label, imageUrl, selectedColor)}
                className="px-6 py-2 bg-black text-white font-bold text-lg hover:bg-blue-700 transition-colors border-2 border-black shadow-[4px_4px_0px_0px_#888] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
              >
                SAVE DATA
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default EditModal;