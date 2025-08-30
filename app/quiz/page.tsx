'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Quiz questions data
const quizQuestions = [
  {
    id: 1,
    question: 'Your travel-planner chatbot cheerfully recommends the "Museum of Underwater Fire," which doesn\'t exist. What just happened?',
    options: [
      'Data drift',
      'Hallucination',
      'Transfer learning',
      'Prompt injection'
    ],
    correctAnswer: 1 // Hallucination
  },
  {
    id: 2,
    question: 'How long did it take to train GPT-3?',
    options: [
      '6 hours',
      '3 days',
      '34 days',
      '200 days'
    ],
    correctAnswer: 2 // 34 days
  },
  {
    id: 3,
    question: 'Which of these is not considered AI?',
    options: [
      'A chess-playing algorithm that looks many moves ahead',
      'A spam filter that learns from emails',
      'A thermostat that switches heating on/off at a fixed temperature',
      'A speech-to-text system that transcribes your words'
    ],
    correctAnswer: 2 // Thermostat
  },
  {
    id: 4,
    question: 'A vision model "learns" to classify wolves vs dogs by noticing snowy backgrounds in wolf photos. This pitfall is called:',
    options: [
      'Mode collapse',
      'Spurious correlation / shortcut learning',
      'Vanishing gradients',
      'Domain adaptation'
    ],
    correctAnswer: 1 // Spurious correlation
  },
  {
    id: 5,
    question: 'What is a neural network "parameter"?',
    options: [
      'The random seed used before training',
      'A number the model adjusts during training (like a weight or bias)',
      'The dataset size',
      'The GPU temperature while training'
    ],
    correctAnswer: 1 // Weight or bias
  },
  {
    id: 6,
    question: 'An AI system trained only on medical images from one hospital performs poorly at another hospital. Why?',
    options: [
      'Overfitting to a narrow data distribution',
      'Reinforcement learning',
      'Hyperparameter tuning',
      'Gradient clipping'
    ],
    correctAnswer: 0 // Overfitting
  },
  {
    id: 7,
    question: 'Which of these is an example of reinforcement learning?',
    options: [
      'A model predicting tomorrow\'s stock price from historical data',
      'A robot that tries different moves, gets rewards, and improves',
      'A program compressing files more efficiently',
      'A neural net trained once and then frozen for predictions'
    ],
    correctAnswer: 1 // Robot learning
  }
];

export default function QuizPage() {
  const [currentStep, setCurrentStep] = useState<'start' | 'quiz' | 'results'>('start');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSubmitted, setEmailSubmitted] = useState(false);

  const handleStartQuiz = () => {
    setCurrentStep('quiz');
  };

  const handleAnswerSelect = (answerIndex: number) => {
    const newAnswers = [...selectedAnswers];
    newAnswers[currentQuestion] = answerIndex;
    setSelectedAnswers(newAnswers);
  };

  const handleNextQuestion = () => {
    if (currentQuestion < quizQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      setCurrentStep('results');
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const calculateScore = () => {
    let correct = 0;
    selectedAnswers.forEach((answer, index) => {
      if (answer === quizQuestions[index].correctAnswer) {
        correct++;
      }
    });
    return correct;
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'email_list'), {
        email: email,
        timestamp: new Date(),
        quizScore: calculateScore(),
        totalQuestions: quizQuestions.length
      });
      setEmailSubmitted(true);
    } catch (error) {
      console.error('Error saving email:', error);
      alert('There was an error saving your email. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetQuiz = () => {
    setCurrentStep('start');
    setCurrentQuestion(0);
    setSelectedAnswers([]);
    setEmail('');
    setEmailSubmitted(false);
  };

  if (currentStep === 'start') {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl bg-gray-900 border-gray-700">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-white mb-4">
              AI Knowledge Quiz
            </CardTitle>
            <p className="text-gray-300 text-lg">
              Test your understanding of AI concepts with our interactive quiz!
            </p>
            <p className="text-gray-400 mt-2">
              7 questions • Multiple choice • Get your results instantly
            </p>
          </CardHeader>
          <CardContent className="text-center">
            <Button
              onClick={handleStartQuiz}
              className="bg-[#c8102e] hover:bg-[#a00d26] text-white px-8 py-3 text-lg"
              size="lg"
            >
              Begin Quiz
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (currentStep === 'quiz') {
    const question = quizQuestions[currentQuestion];
    const selectedAnswer = selectedAnswers[currentQuestion];

    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center p-4">
        <Card className="w-full max-w-3xl bg-gray-900 border-gray-700">
          <CardHeader>
            <div className="flex justify-between items-center mb-4">
              <span className="text-gray-400">
                Question {currentQuestion + 1} of {quizQuestions.length}
              </span>
              <div className="w-full max-w-xs bg-gray-700 rounded-full h-2 ml-4">
                <div
                  className="bg-[#c8102e] h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${((currentQuestion + 1) / quizQuestions.length) * 100}%`
                  }}
                />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-white mb-2">
              Q{question.id}
            </CardTitle>
            <p className="text-gray-300 text-lg leading-relaxed">
              {question.question}
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 mb-6">
              {question.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(index)}
                  className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                    selectedAnswer === index
                      ? 'border-[#c8102e] bg-[#c8102e]/10 text-white'
                      : 'border-gray-600 bg-gray-800 text-gray-300 hover:border-gray-500 hover:bg-gray-700'
                  }`}
                >
                  <span className="font-medium">
                    {String.fromCharCode(65 + index)}) {option}
                  </span>
                </button>
              ))}
            </div>
            <div className="flex justify-between">
              <Button
                onClick={handlePreviousQuestion}
                disabled={currentQuestion === 0}
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                Previous
              </Button>
              <Button
                onClick={handleNextQuestion}
                disabled={selectedAnswer === undefined}
                className="bg-[#c8102e] hover:bg-[#a00d26] text-white"
              >
                {currentQuestion === quizQuestions.length - 1 ? 'Finish Quiz' : 'Next'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (currentStep === 'results') {
    const score = calculateScore();
    const percentage = Math.round((score / quizQuestions.length) * 100);

    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl bg-gray-900 border-gray-700">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-white mb-4">
              Quiz Complete!
            </CardTitle>
            <div className="text-6xl font-bold text-[#c8102e] mb-2">
              {score}/{quizQuestions.length}
            </div>
            <p className="text-xl text-gray-300 mb-4">
              You scored {percentage}%
            </p>
            <p className="text-gray-400">
              {percentage >= 80 ? 'Excellent work!' : 
               percentage >= 60 ? 'Good job!' : 
               percentage >= 40 ? 'Not bad, keep learning!' : 
               'Keep studying AI concepts!'}
            </p>
          </CardHeader>
          <CardContent>
            {!emailSubmitted ? (
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                    Join our newsletter for more AI content
                  </label>
                  <Input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    required
                    className="bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    We will keep your email for 6 months according to GDPR regulations. 
                    You can unsubscribe at any time.
                  </p>
                </div>
                <div className="flex space-x-3">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-[#c8102e] hover:bg-[#a00d26] text-white flex-1"
                  >
                    {isSubmitting ? 'Submitting...' : 'Subscribe'}
                  </Button>
                  <Button
                    type="button"
                    onClick={resetQuiz}
                    variant="outline"
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    Retake Quiz
                  </Button>
                </div>
              </form>
            ) : (
              <div className="text-center space-y-4">
                <p className="text-green-400 text-lg">
                  ✓ Thank you for subscribing to our newsletter!
                </p>
                <Button
                  onClick={resetQuiz}
                  className="bg-[#c8102e] hover:bg-[#a00d26] text-white"
                >
                  Take Quiz Again
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
