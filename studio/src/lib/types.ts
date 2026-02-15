export type DocumentData = {
  id: string;
  userId: string;
  fileName: string;
  uploadDate: string;
  fileType: string;
  fileSize: number;
  text: string;
  name?: string; // for backward compatibility with older mock data if any
  createdAt?: Date; // for backward compatibility with older mock data if any
};

export type SummaryData = {
    summary: string[];
    citations?: {
        page: number;
        paragraph: number;
    }[];
    audience: string;
    language: string;
};
