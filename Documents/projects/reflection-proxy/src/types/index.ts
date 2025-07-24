export type ImageType = {
  id: string;
  title: string;
  image: {
    url: string;
    width: number;
    height: number;
  };
  description?: string;
  category?: string;
  tags?: string[];
};