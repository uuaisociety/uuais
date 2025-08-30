IMPLEMENT a new page called quiz (/quiz) which is an interactive MCQ-quiz.

There should be a "Begin quiz button" 
Then each question of the quiz will have 4 question alternatives, each questions should be a new page.
After the quiz is over you should see your result and be prompted to fill in your email for our newsletter (it should mention here that we will keep your mail for 6 months according to gdpr), we will write this email to a firebase collection called "email_list"

Here is the material for the quiz. 


Q1 — “Confident but wrong”

Your travel-planner chatbot cheerfully recommends the “Museum of Underwater Fire,” which doesn’t exist. What just happened?
A) Data drift
B) Hallucination
C) Transfer learning
D) Prompt injection

Q2 — The sneaky racer

You reward a game agent for passing checkpoints. It learns a short loop that crosses the same checkpoint over and over, farming points instead of finishing the race. This is:

A) Curriculum learning
B) Reward shaping
C) Reward hacking
D) Domain randomization

Q3 — FAQs that change daily

You want the model to answer product FAQs that update every day, without retraining. Best approach?
A) Full fine-tuning on yesterday’s data
B) Manual prompt with copy-pasted FAQs
C) Retrieval-Augmented Generation (RAG) over a live FAQ index
D) Few-shot prompting with random examples

Q4 — Snowy wolves

A vision model “learns” to classify wolves vs dogs by noticing snowy backgrounds in wolf photos. This pitfall is called:
A) Mode collapse
B) Spurious correlation / shortcut learning
C) Vanishing gradients
D) Domain adaptation

Q5 — Filters on a plane ✈️

You’re shipping a selfie filter app. Users want instant results and to keep photos private on their phones. What’s best?
A) Cloud inference with a huge model
B) On-device (edge) inference with a smaller/quantized model
C) Batch uploads to a nightly server job
D) Streaming frames to a GPU cluster