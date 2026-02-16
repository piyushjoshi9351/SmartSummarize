'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { chatAction, generateSuggestedQuestionsAction } from '@/actions/documents';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Send, Mic, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DocumentData } from '@/lib/types';
import { useUser } from '@/firebase';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const formSchema = z.object({
  message: z.string().min(1, { message: 'Message cannot be empty.' }),
});

declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

export function ChatView({ document }: { document: DocumentData }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(true);

  const { user } = useUser();
  const { toast } = useToast();
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { message: '' },
  });

  useEffect(() => {
    async function fetchSuggestions() {
      if (!document.text) {
        setIsLoadingSuggestions(false);
        return;
      }
        
      setIsLoadingSuggestions(true);
      const result = await generateSuggestedQuestionsAction({
        documentText: document.text,
      });
      if (result.success && result.data) {
        setSuggestedQuestions(result.data.questions);
      } else {
        console.error("Failed to fetch suggestions:", result.error);
        setSuggestedQuestions([]);
      }
      setIsLoadingSuggestions(false);
    }
    fetchSuggestions();
  }, [document.text]);

  const onSubmit = useCallback(
    async (values: z.infer<typeof formSchema>) => {
      if (loading) return;
      setLoading(true);
      const userMessage: ChatMessage = { role: 'user', content: values.message };
      setMessages((prev) => [...prev, userMessage]);
      form.reset();

      const result = await chatAction({
        documentText: document.text,
        userQuestion: values.message,
      });

      setLoading(false);
      if (result.success && result.data) {
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: result.data.answer,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to get a response.',
          variant: 'destructive',
        });
        setMessages((prev) => prev.slice(0, -1));
      }
    },
    [document.text, form, toast, loading]
  );

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognitionRef.current = recognition;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      form.setValue('message', transcript, { shouldValidate: true });
       if (transcript.trim()) {
        form.handleSubmit(onSubmit)();
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      toast({
        title: 'Microphone Error',
        description:
          event.error === 'not-allowed'
            ? 'Permission to use microphone was denied.'
            : 'An error occurred with the microphone.',
        variant: 'destructive',
      });
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    return () => {
      recognition.stop();
    };
  }, [form, toast, onSubmit]);

  const handleMicClick = () => {
    if (!recognitionRef.current) {
      toast({
        title: 'Browser Not Supported',
        description: 'Your browser does not support speech recognition.',
        variant: 'destructive',
      });
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      form.reset();
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };
  
  const handleSuggestionClick = (question: string) => {
    form.setValue('message', question);
    form.handleSubmit(onSubmit)();
  };

  return (
    <div className="flex flex-col h-[70vh]">
      <ScrollArea className="flex-1 p-4">
        {messages.length === 0 && !loading ? (
           <div className="text-center py-8">
             <div className="flex justify-center items-center mb-4">
                <Sparkles className="h-6 w-6 mr-2 text-primary" />
                <h3 className="text-lg font-semibold">AI-Suggested Questions</h3>
             </div>
             {isLoadingSuggestions ? (
                <div className="flex justify-center items-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
             ) : suggestedQuestions.length > 0 ? (
                <div className="flex flex-col items-center gap-2">
                    {suggestedQuestions.map((q, i) => (
                        <Button
                          key={i}
                          variant="outline"
                          size="sm"
                          className="w-full max-w-md text-left justify-start h-auto whitespace-normal py-2"
                          onClick={() => handleSuggestionClick(q)}
                        >
                           {q}
                        </Button>
                    ))}
                </div>
             ) : (
                <div className="text-center py-4">
                    <p className="text-muted-foreground text-sm">Couldn't generate suggestions for this document.</p>
                </div>
             )}
           </div>
        ) : (
          <div className="space-y-6">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex items-start gap-3 ${
                  message.role === 'user' ? 'justify-end' : ''
                }`}
              >
                {message.role === 'assistant' && (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>AI</AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={`rounded-lg px-4 py-3 max-w-lg ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
                {message.role === 'user' && (
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.photoURL || undefined} alt="User avatar" />
                    <AvatarFallback>
                      {user?.displayName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            {loading && !isRecording && (
              <div className="flex items-start gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>AI</AvatarFallback>
                </Avatar>
                <div className="rounded-lg px-4 py-3 bg-muted flex items-center">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>
      <div className="border-t p-4">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex items-center gap-2"
          >
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormControl>
                    <Input
                      placeholder={
                        isRecording
                          ? 'Listening...'
                          : 'Ask a question about the document...'
                      }
                      autoComplete="off"
                      {...field}
                      disabled={loading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="button"
              size="icon"
              variant={isRecording ? 'destructive' : 'outline'}
              onClick={handleMicClick}
              disabled={loading}
            >
              <Mic
                className={`h-4 w-4 ${isRecording ? 'animate-pulse' : ''}`}
              />
              <span className="sr-only">Ask with voice</span>
            </Button>
            <Button
              type="submit"
              size="icon"
              disabled={loading || isRecording}
            >
              <Send className="h-4 w-4" />
              <span className="sr-only">Send</span>
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
