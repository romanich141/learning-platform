import { useState } from "react";

export const LikeButton = () => {
  const [liked, setLiked] = useState(false);

  let x = 0;
  for (let i = 0; i < 20_000_000; i++) {
    x += Math.sqrt(i);
  }

  return (
    <button
      onClick={() => {
        console.log("click");
        setLiked((v) => !v);
      }}
    >
      {liked ? "❤️" : "🤍"}
    </button>
  );
};
