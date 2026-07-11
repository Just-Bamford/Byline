import { useState } from "react";
import "./OnboardingWizard.css";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}

export function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [steps, setSteps] = useState<OnboardingStep[]>([
    {
      id: "account",
      title: "Create Your Account",
      description: "Set up your publisher profile",
      completed: true,
    },
    {
      id: "wallet",
      title: "Connect Wallet",
      description: "Link your Stellar wallet for payments",
      completed: false,
    },
    {
      id: "profile",
      title: "Complete Profile",
      description: "Add your publication name and details",
      completed: false,
    },
    {
      id: "first-article",
      title: "Publish First Article",
      description: "Create and publish your first article",
      completed: false,
    },
    {
      id: "settings",
      title: "Configure Settings",
      description: "Set pricing and notification preferences",
      completed: false,
    },
  ]);

  const [formData, setFormData] = useState({
    publisherName: "",
    walletAddress: "",
    website: "",
    description: "",
  });

  const completeStep = (stepId: string) => {
    setSteps(
      steps.map((s) => (s.id === stepId ? { ...s, completed: true } : s)),
    );
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      completeStep(steps[currentStep].id);
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const completionPercent = Math.round(
    (steps.filter((s) => s.completed).length / steps.length) * 100,
  );

  const currentStepData = steps[currentStep];

  return (
    <div className="onboarding-wizard">
      <div className="wizard-header">
        <h2>Welcome to Byline! 🎉</h2>
        <p>
          Let's get you set up in {Math.ceil((5 - currentStep) * 2)} minutes
        </p>
      </div>

      <div className="wizard-container">
        <aside className="wizard-sidebar">
          <div className="progress-indicator">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${completionPercent}%` }}
              ></div>
            </div>
            <p className="progress-text">{completionPercent}% Complete</p>
          </div>

          <div className="steps-list">
            {steps.map((step, idx) => (
              <div
                key={step.id}
                className={`step-item ${currentStep === idx ? "active" : ""} ${
                  step.completed ? "completed" : ""
                }`}
              >
                <div className="step-indicator">
                  {step.completed ? "✓" : idx + 1}
                </div>
                <div className="step-info">
                  <h4>{step.title}</h4>
                  <p>{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </aside>

        <main className="wizard-content">
          <div className="step-content">
            {currentStep === 0 && (
              <div className="step-view">
                <h3>Account Created! 🎊</h3>
                <p>
                  Great job! Your account is ready. Now let's connect your
                  wallet to start earning.
                </p>
                <div className="feature-list">
                  <div className="feature">
                    <span>✓</span>
                    <div>
                      <strong>Email Verified</strong>
                      <p>Your account is secure</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div className="step-view">
                <h3>Connect Your Wallet</h3>
                <p>Link your Stellar wallet to receive payments</p>
                <form className="wizard-form">
                  <div className="form-group">
                    <label>Wallet Address</label>
                    <input
                      type="text"
                      placeholder="G..."
                      value={formData.walletAddress}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          walletAddress: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="info-box">
                    <p>
                      💡 Your Stellar wallet address starts with 'G' and is 56
                      characters long.
                    </p>
                  </div>
                </form>
              </div>
            )}

            {currentStep === 2 && (
              <div className="step-view">
                <h3>Complete Your Profile</h3>
                <p>Tell readers about your publication</p>
                <form className="wizard-form">
                  <div className="form-group">
                    <label>Publication Name</label>
                    <input
                      type="text"
                      placeholder="Your publication name"
                      value={formData.publisherName}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          publisherName: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>Website (Optional)</label>
                    <input
                      type="url"
                      placeholder="https://yoursite.com"
                      value={formData.website}
                      onChange={(e) =>
                        setFormData({ ...formData, website: e.target.value })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>Description</label>
                    <textarea
                      placeholder="Tell readers what your publication is about"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      rows={4}
                    ></textarea>
                  </div>
                </form>
              </div>
            )}

            {currentStep === 3 && (
              <div className="step-view">
                <h3>Ready to Publish?</h3>
                <p>Create your first article to start earning</p>
                <div className="feature-list">
                  <div className="feature">
                    <span>📰</span>
                    <div>
                      <strong>Article Editor</strong>
                      <p>Write rich, formatted content</p>
                    </div>
                  </div>
                  <div className="feature">
                    <span>💰</span>
                    <div>
                      <strong>Set Your Price</strong>
                      <p>Control how much readers pay</p>
                    </div>
                  </div>
                  <div className="feature">
                    <span>📊</span>
                    <div>
                      <strong>Track Analytics</strong>
                      <p>See reads and earnings in real-time</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="step-view">
                <h3>You're All Set! 🚀</h3>
                <p>Start earning from your quality journalism</p>
                <div className="checklist">
                  <div className="checklist-item">
                    <input type="checkbox" checked disabled />
                    <label>Account created</label>
                  </div>
                  <div className="checklist-item">
                    <input type="checkbox" checked disabled />
                    <label>Wallet connected</label>
                  </div>
                  <div className="checklist-item">
                    <input type="checkbox" checked disabled />
                    <label>Profile completed</label>
                  </div>
                  <div className="checklist-item">
                    <input type="checkbox" checked disabled />
                    <label>First article published</label>
                  </div>
                  <div className="checklist-item">
                    <input type="checkbox" checked disabled />
                    <label>Settings configured</label>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="wizard-actions">
            <button
              className="btn btn-secondary"
              onClick={handlePrevious}
              disabled={currentStep === 0}
            >
              Previous
            </button>
            <button className="btn btn-primary" onClick={handleNext}>
              {currentStep === steps.length - 1 ? "Go to Dashboard" : "Next"}
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
