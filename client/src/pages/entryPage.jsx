import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../entryPage.css';

const EntryPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
   
    const createBubble = () => {
      const bubble = document.createElement('div');
      bubble.className = 'bubble';

      const size = Math.random() * 60 + 20;
      bubble.style.width = size + 'px';
      bubble.style.height = size + 'px';

      bubble.style.left = Math.random() * 100 + '%';
  
      const duration = Math.random() * 7 + 8;
      bubble.style.animationDuration = duration + 's';
    
      bubble.style.animationDelay = Math.random() * 2 + 's';
      
      const bubblesContainer = document.getElementById('bubbles');
      if (bubblesContainer) {
        bubblesContainer.appendChild(bubble);
   
        setTimeout(() => {
          if (bubble.parentNode) {
            bubble.parentNode.removeChild(bubble);
          }
        }, (duration + 2) * 1000);
      }
    };

    const bubbleInterval = setInterval(createBubble, 800);

    for (let i = 0; i < 10; i++) {
      setTimeout(createBubble, i * 200);
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        navigateToLogin();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      clearInterval(bubbleInterval);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const navigateToLogin = () => {
    createParticles();
    setTimeout(() => {
      navigate('/login');
    }, 500);
  };

  const createParticles = () => {
    const button = document.querySelector('.cta-button');
    const rect = button.getBoundingClientRect();
    
    for (let i = 0; i < 15; i++) {
      setTimeout(() => {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * rect.width + 'px';
        particle.style.top = Math.random() * rect.height + 'px';
        particle.style.animationDelay = Math.random() * 0.5 + 's';
        
        const particlesContainer = document.getElementById('particles');
        if (particlesContainer) {
          particlesContainer.appendChild(particle);
          
          setTimeout(() => {
            if (particle.parentNode) {
              particle.parentNode.removeChild(particle);
            }
          }, 2000);
        }
      }, i * 50);
    }
  };

  return (
    <div className="entry-page">
      {/* Floating Bubbles Background */}
      <div className="bubbles" id="bubbles"></div>
      
      {/* Particle Effects Container */}
      <div className="particles" id="particles"></div>

      {/* Main Content */}
      <div className="container">
        <div className="logo-section">
          <div className="logo">
            <svg viewBox="0 0 24 24">
              <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
            </svg>
          </div>
        </div>

        <h1 className="main-heading">Welcome to NodeTalk</h1>
        
        <p className="description">
          A real-time chatting application where your conversations flow seamlessly. 
          Your data is secure, your privacy is protected, and your connections are instant.
        </p>

        <button className="cta-button" onClick={navigateToLogin}>
          Get Started
        </button>
        </div>
    </div>
  );
};

export default EntryPage;