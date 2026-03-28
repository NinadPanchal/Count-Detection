import { useEffect, useState, useRef } from "react";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*";

export function DecryptedText({ text, className = "", animateOn = "always" }: { text: string, className?: string, animateOn?: "hover" | "always" | "onMount" }) {
  const [displayText, setDisplayText] = useState(animateOn === "always" || animateOn === "onMount" ? "" : text);
  const [isAnimating, setIsAnimating] = useState(animateOn === "always" || animateOn === "onMount");
  const iterationRef = useRef(0);

  useEffect(() => {
    if (!isAnimating) return;
    
    let isMounted = true;
    iterationRef.current = 0;
    
    const interval = setInterval(() => {
      if (!isMounted) return clearInterval(interval);
      
      setDisplayText((prev) => {
        const iter = iterationRef.current;
        if (iter >= text.length) {
          clearInterval(interval);
          setIsAnimating(false);
          return text;
        }

        return text
          .split("")
          .map((char, index) => {
            if (index < iter) return text[index];
            return CHARS[Math.floor(Math.random() * CHARS.length)];
          })
          .join("");
      });
      
      iterationRef.current += 1/3; // Speed of deciphering
    }, 30);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [text, isAnimating]);

  return (
    <span 
      className={className} 
      onMouseEnter={() => animateOn === "hover" ? setIsAnimating(true) : null}
    >
      {isAnimating ? displayText : text}
    </span>
  );
}
