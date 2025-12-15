
import React from 'react';
import { Button } from './Button';

interface PrivacyPolicyProps {
  onBack: () => void;
}

export const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-6 sm:p-12 font-sans animate-fade-in">
      <div className="max-w-4xl mx-auto bg-white dark:bg-slate-800 rounded-3xl shadow-xl p-8 border border-slate-200 dark:border-slate-700">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold font-display text-brand-purple">Privacy Policy</h1>
          <Button onClick={onBack} variant="secondary" size="sm">Back to App</Button>
        </div>

        <div className="prose dark:prose-invert max-w-none space-y-6">
          <p className="text-sm text-slate-500">Last Updated: October 2023</p>

          <section>
            <h2 className="text-xl font-bold mb-2">1. Introduction</h2>
            <p>
              Welcome to PYQverse ("we," "our," or "us"). We are committed to protecting your personal information and your right to privacy. 
              This policy explains how we collect, use, and safeguard your information when you use our mobile application and website.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">2. Information We Collect</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Personal Information:</strong> We collect your Name, Email Address, and Profile Picture (via Google Login) to create your account and save your progress.</li>
              <li><strong>Usage Data:</strong> We track your exam preferences, question history, and performance stats to provide personalized analytics.</li>
              <li><strong>User Content:</strong> Any questions, images, or notes you upload to the "Doubt Solver" or "My Notes" section are stored securely linked to your account.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">3. How We Use Your Information</h2>
            <p>We use your data strictly to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Authenticate your identity and secure your account.</li>
              <li>Generate personalized questions and mock tests via our AI engine.</li>
              <li>Track and display your learning progress and leaderboard ranking.</li>
              <li>Improve app performance and fix bugs.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">4. Data Sharing & Security</h2>
            <p>
              We <strong>do not sell</strong> your personal data to third parties. Your data is stored on secure Firebase servers (Google Cloud Platform). 
              We may share anonymous, aggregated data for analytical purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">5. Your Rights</h2>
            <p>
              You have the right to request access to your data or request deletion of your account at any time via the "Profile" section in the app 
              or by contacting us at <a href="mailto:support@pyqverse.in" className="text-brand-purple hover:underline">support@pyqverse.in</a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-2">6. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us:
              <br />
              <strong>Email:</strong> support@pyqverse.in
            </p>
          </section>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700 text-center">
           <p className="text-xs text-slate-500">© 2025 PYQverse. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};
