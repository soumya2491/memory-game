import React, { useState, useEffect, useCallback, useMemo } from 'react';

// Card Icons (8 pairs = 16 cards)
const EMOJIS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

/**
 * Shuffles an array using the Fisher-Yates algorithm.
 * @param {Array} array - The array to shuffle.
 * @returns {Array} The shuffled array.
 */
const shuffleArray = (array) => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

/**
 * Initializes the game board with shuffled, paired cards.
 */
const initializeCards = () => {
  // Create pairs
  const pairedIcons = [...EMOJIS, ...EMOJIS];
  
  // Map to card objects and shuffle
  const cards = pairedIcons.map((icon, index) => ({
    id: index,
    icon,
    isFlipped: false,
    isMatched: false,
  }));
  
  return shuffleArray(cards);
};

// --- Custom Card Component with 3D Flip Animation ---

const Card = React.memo(({ card, onClick }) => {
  const { icon, isFlipped, isMatched } = card;

  // Combined CSS for the 3D flip container
  const cardStyles = `
    perspective: 1000px;
    height: 100%;
    width: 100%;
    cursor: ${isMatched ? 'default' : 'pointer'};
    transition: transform 0.3s ease-out;
    ${isMatched ? 'transform: scale(0.9); opacity: 0.6;' : ''}
    ${isFlipped && !isMatched ? 'transform: scale(1.05);' : ''}
  `;

  // Inner CSS for the flipping mechanism
  const innerStyles = `
    position: relative;
    width: 100%;
    height: 100%;
    text-align: center;
    transition: transform 0.6s cubic-bezier(0.17, 0.84, 0.44, 1);
    transform-style: preserve-3d;
    ${isFlipped ? 'transform: rotateY(180deg);' : 'transform: rotateY(0deg);'}
  `;

  // Face CSS (front and back)
  const faceStyles = `
    absolute
    w-full h-full
    backface-hidden
    rounded-xl
    shadow-lg
    flex items-center justify-center
    text-5xl
  `;
  
  // Specific back face style
  const backFaceStyle = `
    ${faceStyles}
    bg-indigo-600
    hover:bg-indigo-700
    text-white
  `;
  
  // Specific front face style
  const frontFaceStyle = `
    ${faceStyles}
    bg-white
    text-gray-900
    transform: rotateY(180deg);
  `;
  
  return (
    <div 
      className="aspect-square" 
      style={{
        ...(!isMatched && !isFlipped ? { transform: 'translateZ(0)' } : {}), // Safari fix
        ...({ cardStyles })
      }}
      onClick={() => !isFlipped && !isMatched && onClick(card.id)}
    >
      <div 
        style={{ innerStyles }}
        className={`
          relative w-full h-full text-center 
          transition-transform duration-500 ease-in-out transform-style-preserve-3d
          ${isFlipped ? 'rotate-y-180' : ''}
          ${isMatched ? 'animate-pulse' : ''}
        `}
      >
        {/* Card Back */}
        <div 
          className="absolute w-full h-full backface-hidden rounded-xl shadow-xl flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white transition duration-300"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <span className="text-xl font-bold select-none">?</span>
        </div>
        
        {/* Card Front (Icon) */}
        <div 
          className="absolute w-full h-full backface-hidden rounded-xl shadow-xl flex items-center justify-center bg-white text-gray-900"
          style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden' }}
        >
          <span className="text-5xl">{icon}</span>
        </div>
      </div>
    </div>
  );
});

// --- Main App Component ---

const App = () => {
  const [cards, setCards] = useState(initializeCards());
  const [flippedIndices, setFlippedIndices] = useState([]);
  const [moves, setMoves] = useState(0);
  const [isChecking, setIsChecking] = useState(false);
  const [isGameWon, setIsGameWon] = useState(false);

  // Check if all cards are matched
  const checkWinCondition = useCallback((currentCards) => {
    return currentCards.every(card => card.isMatched);
  }, []);

  // Effect to handle the card matching logic after two cards are flipped
  useEffect(() => {
    if (flippedIndices.length === 2) {
      setIsChecking(true);
      const [index1, index2] = flippedIndices;
      const card1 = cards.find(c => c.id === index1);
      const card2 = cards.find(c => c.id === index2);

      const isMatch = card1.icon === card2.icon;

      // Delay to allow user to see the second card
      const timeout = setTimeout(() => {
        setCards(prevCards => {
          const newCards = prevCards.map(card => {
            if (card.id === index1 || card.id === index2) {
              return { ...card, isMatched: isMatch, isFlipped: isMatch };
            }
            // Flip back non-matching cards
            if (!isMatch && (card.id === index1 || card.id === index2)) {
                return { ...card, isFlipped: false };
            }
            return card;
          });

          setIsChecking(false);
          setFlippedIndices([]);
          setMoves(m => m + 1);

          if (isMatch && checkWinCondition(newCards)) {
            setIsGameWon(true);
          }
          
          return newCards;
        });
      }, isMatch ? 600 : 1000); // Shorter delay for match, longer for non-match

      return () => clearTimeout(timeout);
    }
  }, [flippedIndices, cards, checkWinCondition]);

  // Handler for card click
  const handleCardClick = useCallback((id) => {
    if (isChecking || flippedIndices.length === 2) return;

    // Flip the clicked card
    setCards(prevCards => {
      // Find the card to flip
      const cardIndex = prevCards.findIndex(c => c.id === id);
      if (cardIndex === -1 || prevCards[cardIndex].isFlipped || prevCards[cardIndex].isMatched) {
        return prevCards;
      }

      const newCards = [...prevCards];
      newCards[cardIndex] = { ...newCards[cardIndex], isFlipped: true };

      // Add to flipped list
      setFlippedIndices(prev => {
        if (prev.includes(id)) return prev; // Avoid double flip
        return [...prev, id];
      });

      return newCards;
    });
  }, [isChecking, flippedIndices.length]);

  // Reset function
  const resetGame = useCallback(() => {
    setCards(initializeCards());
    setFlippedIndices([]);
    setMoves(0);
    setIsChecking(false);
    setIsGameWon(false);
  }, []);

  // Memoize the grid for performance
  const cardGrid = useMemo(() => (
    <div className="grid grid-cols-4 gap-4 w-full max-w-lg mx-auto">
      {cards.map((card) => (
        <Card 
          key={card.id} 
          card={card} 
          onClick={handleCardClick}
        />
      ))}
    </div>
  ), [cards, handleCardClick]);

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8 flex flex-col items-center justify-center font-sans">
      
      {/* Header and Info */}
      <header className="text-center mb-8">
        <h1 className="text-5xl font-extrabold text-indigo-800 tracking-tight mb-2">
          Memory Match 🧠
        </h1>
        <p className="text-xl text-gray-600">
          Find all the matching pairs!
        </p>
        <div className="mt-4 p-3 bg-white rounded-lg shadow-md inline-block">
          <p className="text-lg font-semibold text-gray-700">
            Moves: <span className="text-indigo-600 ml-1">{moves}</span>
          </p>
        </div>
      </header>

      {/* Game Grid */}
      <main className="w-full max-w-xl">
        {cardGrid}
      </main>

      {/* Reset Button */}
      <button 
        onClick={resetGame}
        className="mt-8 px-6 py-3 bg-pink-500 text-white font-bold rounded-full shadow-lg hover:bg-pink-600 transition duration-300 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-pink-300"
      >
        Start New Game
      </button>

      {/* Win Modal (Celebration Effect) */}
      {isGameWon && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-10 rounded-3xl shadow-2xl text-center max-w-md w-full animate-in zoom-in-75 duration-500">
            <div className="text-6xl mb-4 animate-bounce">
              🎉
            </div>
            <h2 className="text-4xl font-extrabold text-green-600 mb-4">
              You Win!
            </h2>
            <p className="text-xl text-gray-700 mb-6">
              You found all pairs in just <span className="font-bold text-indigo-600">{moves}</span> moves!
            </p>
            <button
              onClick={resetGame}
              className="px-8 py-4 bg-indigo-600 text-white font-bold text-lg rounded-full shadow-xl hover:bg-indigo-700 transition duration-300 transform hover:scale-105 active:scale-95"
            >
              Play Again
            </button>
          </div>
        </div>
      )}
      
      {/* Tailwind CSS utility classes are assumed to be available globally. 
          Adding custom CSS for 3D effect in a style tag for the single file requirement. 
          In a real React environment, this would be handled by CSS modules or a library. */}
      <style>
        {`
          /* Custom utility for the 3D flip effect */
          .rotate-y-180 {
            transform: rotateY(180deg);
          }
          .backface-hidden {
            backface-visibility: hidden;
          }
          .transform-style-preserve-3d {
            transform-style: preserve-3d;
          }
          
          /* Animation for victory modal */
          @keyframes zoom-in {
            from {
              opacity: 0;
              transform: scale(0.75);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }
          .animate-in {
            animation: zoom-in 0.5s cubic-bezier(0.68, -0.55, 0.27, 1.55) forwards;
          }
        `}
      </style>
    </div>
  );
};

export default App;
