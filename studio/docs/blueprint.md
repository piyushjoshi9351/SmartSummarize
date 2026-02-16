# **App Name**: SummarAIze

## Core Features:

- User Authentication: Secure user authentication using Firebase Auth (email/password).
- Document Upload: Allow users to upload PDF or DOCX files.
- Text Extraction: Extract text from uploaded PDF and DOCX documents.
- AI Summary Generation: Generate summaries tailored to selected audiences (Student, Lawyer, Researcher, General Public) using OpenAI/Gemini. The LLM will use a tool that performs relevance ranking, deciding what sections of the document should be included in the output.
- Formatted Summary Display: Display the AI generated summary in a clear bullet-point format with citation references (page or paragraph numbers).
- Document Chat: Enable users to chat with the uploaded document, referencing specific sections to help generate answers to the user's questions.
- History Saving: Save user summary history with citation data to Firebase Firestore for later access.

## Style Guidelines:

- Primary color: Deep blue (#2962FF) to evoke trust and intelligence.
- Background color: Light blue (#E6F0FF) for a clean and professional feel.
- Accent color: Teal (#26A69A) for interactive elements and highlights.
- Body and headline font: 'Inter', a grotesque-style sans-serif font, for a modern, machined look, in both headlines and body text.
- Use a set of minimalist icons for document actions and navigation.
- Implement a clean, responsive layout optimized for various screen sizes using Tailwind CSS.
- Subtle transitions and animations to enhance user experience.