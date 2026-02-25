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
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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

type SpeechRecognitionResultItem = {
  transcript: string;
};

type SpeechRecognitionEventLike = {
  results: SpeechRecognitionResultItem[][];
};

type SpeechRecognitionErrorEventLike = {
  error: string;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

const formSchema = z.object({
  message: z.string().min(1, { message: 'Message cannot be empty.' }),
});

export function ChatView({ document }: { document: DocumentData }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(true);

  const { user } = useUser();
  const { toast } = useToast();
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

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
      if (!result.success) {
        console.error('Failed to fetch suggestions:', result.success ? '' : result.error);
        setSuggestedQuestions([]);
      } else {
        setSuggestedQuestions(result.data.questions);
      }
      setIsLoadingSuggestions(false);
    }
    fetchSuggestions();
  }, [document.text]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, loading]);

  const onSubmit = useCallback(
    async (values: z.infer<typeof formSchema>) => {
      if (loading) return;
      const documentText = document.text || document.textPreview || '';
      if (!documentText.trim()) {
        toast({
          title: 'No text available',
          description: 'This document has no readable text for chat.',
          variant: 'destructive',
        });
        return;
      }

      setLoading(true);
      const userMessage: ChatMessage = { role: 'user', content: values.message };
      setMessages((prev) => [...prev, userMessage]);
      form.reset();

      const result = await chatAction({
        documentText,
        userQuestion: values.message,
      });

      setLoading(false);
      if (!result.success) {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        });
        setMessages((prev) => prev.slice(0, -1));
      } else {
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: result.data.answer,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    },
    [document.text, form, toast, loading]
  );

  useEffect(() => {
    const speechWindow = window as Window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const SpeechRecognitionCtor =
      speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return;

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognitionRef.current = recognition;

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      const transcript = event.results[0][0].transcript;
      form.setValue('message', transcript, { shouldValidate: true });
       if (transcript.trim()) {
        form.handleSubmit(onSubmit)();
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
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
    <div className="flex flex-col h-[70vh] gap-4">
      <Card className="overflow-hidden border-primary/20 bg-card/80 shadow-lg shadow-primary/10 backdrop-blur-sm">
        <CardHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 border-b border-primary/10 pb-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-xl sm:text-2xl">Chat with Document</CardTitle>
              <CardDescription className="text-xs sm:text-sm mt-1">Fast answers from your file.</CardDescription>
            </div>
            <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              AI Assistant
            </span>
          </div>
        </CardHeader>
      </Card>
      <ScrollArea className="flex-1 rounded-xl border border-border/60 bg-background/60 p-4 shadow-sm">
        {messages.length === 0 && !loading ? (
           <div className="text-center py-8 animate-in fade-in duration-500">
             <div className="flex justify-center items-center mb-6">
                <Sparkles className="h-5 w-5 mr-2 text-primary animate-pulse" />
                <h3 className="text-base font-semibold">Suggested Questions</h3>
             </div>
             {isLoadingSuggestions ? (
                <div className="flex justify-center items-center py-4 animate-in fade-in">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <p className="text-xs text-muted-foreground">Generating questions...</p>
                    </div>
                </div>
             ) : suggestedQuestions.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-3xl mx-auto">
                    {suggestedQuestions.map((q, i) => (
                        <Button
                          key={i}
                          variant="outline"
                          size="sm"
                          className="w-full text-left justify-start h-auto whitespace-normal py-3 hover:bg-primary/10 hover:text-primary hover:border-primary/40 transition-all duration-300 hover:-translate-y-0.5 border-primary/20 animate-in fade-in slide-in-from-bottom" 
                          style={{ animationDelay: `${i * 100}ms` }}
                          onClick={() => handleSuggestionClick(q)}
                        >
                           {q}
                        </Button>
                    ))}
                </div>
             ) : (
                <div className="text-center py-4 animate-in fade-in">
                    <p className="text-muted-foreground text-sm">Couldn't generate suggestions. Try typing a question directly!</p>
                </div>
             )}
           </div>
        ) : (
          <div className="space-y-6">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex items-end gap-3 animate-in fade-in-50 duration-300 ${
                  message.role === 'user' ? 'justify-end' : ''
                }`}
              >
                {message.role === 'assistant' && (
                  <Avatar className="h-8 w-8 ring-1 ring-primary/20">
                    <AvatarFallback>AI</AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={`rounded-2xl px-4 py-3 max-w-[80%] shadow-sm transition-all ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-md'
                      : 'bg-muted border border-border/60 rounded-bl-md'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
                {message.role === 'user' && (
                  <Avatar className="h-8 w-8 ring-1 ring-primary/20">
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
                <Avatar className="h-8 w-8 ring-1 ring-primary/20">
                  <AvatarFallback>AI</AvatarFallback>
                </Avatar>
                <div className="rounded-2xl rounded-bl-md px-4 py-3 bg-muted border border-border/60 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-primary/60 animate-bounce [animation-delay:-0.2s]" />
                  <span className="h-2 w-2 rounded-full bg-primary/60 animate-bounce [animation-delay:-0.1s]" />
                  <span className="h-2 w-2 rounded-full bg-primary/60 animate-bounce" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>
      <div className="border-t rounded-xl border-border/60 bg-card/60 p-4 backdrop-blur-sm">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex items-center gap-2 rounded-xl border border-border/70 bg-background/80 p-2"
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
                      className="border-0 bg-transparent shadow-none focus-visible:ring-0"
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
              className="transition-transform duration-200 hover:scale-105"
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
              className="transition-transform duration-200 hover:scale-105"
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
