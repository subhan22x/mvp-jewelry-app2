export type PictureMetal = 'rose_gold' | 'white_gold' | 'yellow_gold';

export type PictureStyleConfig = {
  id: string;
  label: string;
  src?: string;
  baseImage: string;
  maskImage: string;
  available?: boolean;
};

export type PictureCustomerInput = {
  userId: string;
  styleId: string;
  primaryMetal: PictureMetal;
  uploadedImagePath: string;
  uploadFileName?: string | null;
};

export type BuiltPictureVariant = {
  variant: 1;
  prompt: string;
  attachments: string[];
};

export type PictureCompositeInput = {
  userId: string;
  styleId: string;
  primaryMetal: PictureMetal;
  uploadedImagePath: string;
  uploadFileName?: string | null;
};

export type PreparedPictureComposite = {
  variant: 1;
  prompt: string;
  style: PictureStyleConfig;
  uploadedImagePath: string;
};
