// components/ExpensiveList.tsx
import React, { useState, useMemo, useCallback } from 'react';

// 1. Child Component (معمول له Memo عشان ميعملش رندر إلا لو الـ props اتغيرت)
const ListItem = React.memo(({ item, onDelete }: { item: string, onDelete: (item: string) => void }) => {
  console.log(`Rendering Item: ${item}`); // هتظهر بس لو العنصر ده اتغير
  return (
    <div className="flex justify-between p-2 border-b">
      <span>{item}</span>
      <button onClick={() => onDelete(item)} className="text-red-500">Delete</button>
    </div>
  );
});

export default function ExpensiveList() {
  const [items, setItems] = useState(['Apple', 'Banana', 'Orange', 'Mango']);
  const [count, setCount] = useState(0); // State ملوش علاقة بالليستة

  // 2. useMemo: عشان ميعملش فلترة (عملية تقيلة) كل ما أدوس على زرار العداد
  const filteredItems = useMemo(() => {
    console.log("Filtering items..."); // هتظهر بس لما items تتغير
    // تخيل هنا عملية حسابية معقدة جداً بتاخد ثانية
    return items.filter(item => item.includes('a')); 
  }, [items]);

  // 3. useCallback: عشان الفانكشن دي تفضل "نفس النسخة" في الذاكرة
  // لو شلت useCallback، كل مرة الـ count يتغير، ListItem هيتعمل له رندر تاني
  const handleDelete = useCallback((itemToDelete: string) => {
    setItems((prev) => prev.filter((i) => i !== itemToDelete));
  }, []); // فاضي لأن الـ setter function (setItems) مش بيتغير أبداً

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold">Counter: {count}</h1>
      <button 
        className="bg-blue-500 text-white px-4 py-2 rounded mb-4"
        onClick={() => setCount(c => c + 1)}
      >
        Increment Count (Should not re-render list)
      </button>

      <div className="border rounded p-4">
        {filteredItems.map((item) => (
          <ListItem key={item} item={item} onDelete={handleDelete} />
        ))}
      </div>
    </div>
  );
}