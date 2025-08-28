import cv2
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter
from typing import Tuple, Optional
import io

class ImageProcessor:
    """Handles image preprocessing and enhancement for AI models."""
    
    def __init__(self):
        self.target_size = (640, 640)  # YOLOv8 default input size
        self.quality_threshold = 0.3  # Minimum quality threshold
    
    def preprocess(self, image: Image.Image) -> np.ndarray:
        """
        Preprocess image for AI model inference.
        
        Args:
            image: PIL Image object
            
        Returns:
            Preprocessed image as numpy array
        """
        try:
            # Convert to RGB if needed
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Enhance image quality
            enhanced_image = self._enhance_image(image)
            
            # Resize to target size
            resized_image = enhanced_image.resize(self.target_size, Image.Resampling.LANCZOS)
            
            # Convert to numpy array
            image_array = np.array(resized_image)
            
            # Normalize to 0-1 range
            image_array = image_array.astype(np.float32) / 255.0
            
            return image_array
            
        except Exception as e:
            raise ValueError(f"Image preprocessing failed: {str(e)}")
    
    def _enhance_image(self, image: Image.Image) -> Image.Image:
        """
        Enhance image quality for better detection.
        
        Args:
            image: PIL Image object
            
        Returns:
            Enhanced image
        """
        try:
            # Convert to numpy for OpenCV operations
            img_array = np.array(image)
            
            # Apply CLAHE (Contrast Limited Adaptive Histogram Equalization)
            lab = cv2.cvtColor(img_array, cv2.COLOR_RGB2LAB)
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            lab[:, :, 0] = clahe.apply(lab[:, :, 0])
            enhanced = cv2.cvtColor(lab, cv2.COLOR_LAB2RGB)
            
            # Convert back to PIL
            enhanced_image = Image.fromarray(enhanced)
            
            # Apply additional enhancements
            enhanced_image = self._apply_filters(enhanced_image)
            
            return enhanced_image
            
        except Exception as e:
            # Return original image if enhancement fails
            return image
    
    def _apply_filters(self, image: Image.Image) -> Image.Image:
        """
        Apply image filters for better quality.
        
        Args:
            image: PIL Image object
            
        Returns:
            Filtered image
        """
        try:
            # Sharpen image
            sharpened = image.filter(ImageFilter.UnsharpMask(radius=1, percent=150, threshold=3))
            
            # Enhance contrast
            contrast_enhancer = ImageEnhance.Contrast(sharpened)
            enhanced = contrast_enhancer.enhance(1.2)
            
            # Enhance brightness slightly
            brightness_enhancer = ImageEnhance.Brightness(enhanced)
            enhanced = brightness_enhancer.enhance(1.1)
            
            return enhanced
            
        except Exception as e:
            return image
    
    def extract_region(self, image: np.ndarray, bbox: list) -> np.ndarray:
        """
        Extract region from image using bounding box.
        
        Args:
            image: Image as numpy array
            bbox: Bounding box [x1, y1, x2, y2]
            
        Returns:
            Extracted region as numpy array
        """
        try:
            x1, y1, x2, y2 = map(int, bbox)
            
            # Ensure coordinates are within image bounds
            height, width = image.shape[:2]
            x1 = max(0, min(x1, width))
            y1 = max(0, min(y1, height))
            x2 = max(0, min(x2, width))
            y2 = max(0, min(y2, height))
            
            # Extract region
            region = image[y1:y2, x1:x2]
            
            return region
            
        except Exception as e:
            raise ValueError(f"Region extraction failed: {str(e)}")
    
    def resize_region(self, region: np.ndarray, target_size: Tuple[int, int] = (224, 224)) -> np.ndarray:
        """
        Resize extracted region for classification.
        
        Args:
            region: Region as numpy array
            target_size: Target size (width, height)
            
        Returns:
            Resized region
        """
        try:
            # Convert to PIL for resizing
            pil_region = Image.fromarray(region)
            resized = pil_region.resize(target_size, Image.Resampling.LANCZOS)
            
            return np.array(resized)
            
        except Exception as e:
            raise ValueError(f"Region resizing failed: {str(e)}")
    
    def validate_image(self, image: Image.Image) -> bool:
        """
        Validate image quality and format.
        
        Args:
            image: PIL Image object
            
        Returns:
            True if image is valid, False otherwise
        """
        try:
            # Check image size
            width, height = image.size
            if width < 100 or height < 100:
                return False
            
            # Check image mode
            if image.mode not in ['RGB', 'RGBA', 'L']:
                return False
            
            # Check for blank or very dark images
            img_array = np.array(image)
            if len(img_array.shape) == 3:
                gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
            else:
                gray = img_array
            
            # Calculate brightness
            brightness = np.mean(gray)
            if brightness < 30:  # Too dark
                return False
            
            # Calculate contrast
            contrast = np.std(gray)
            if contrast < 10:  # Too low contrast
                return False
            
            return True
            
        except Exception as e:
            return False
    
    def compress_image(self, image: Image.Image, quality: int = 85) -> bytes:
        """
        Compress image for storage or transmission.
        
        Args:
            image: PIL Image object
            quality: JPEG quality (1-100)
            
        Returns:
            Compressed image as bytes
        """
        try:
            # Convert to RGB if needed
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Compress to JPEG
            buffer = io.BytesIO()
            image.save(buffer, format='JPEG', quality=quality, optimize=True)
            
            return buffer.getvalue()
            
        except Exception as e:
            raise ValueError(f"Image compression failed: {str(e)}")
    
    def create_thumbnail(self, image: Image.Image, size: Tuple[int, int] = (150, 150)) -> Image.Image:
        """
        Create thumbnail for preview.
        
        Args:
            image: PIL Image object
            size: Thumbnail size (width, height)
            
        Returns:
            Thumbnail image
        """
        try:
            # Create thumbnail maintaining aspect ratio
            thumbnail = image.copy()
            thumbnail.thumbnail(size, Image.Resampling.LANCZOS)
            
            return thumbnail
            
        except Exception as e:
            raise ValueError(f"Thumbnail creation failed: {str(e)}")
    
    def detect_blur(self, image: np.ndarray) -> float:
        """
        Detect image blur using Laplacian variance.
        
        Args:
            image: Image as numpy array
            
        Returns:
            Blur score (higher = less blurry)
        """
        try:
            # Convert to grayscale
            if len(image.shape) == 3:
                gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
            else:
                gray = image
            
            # Calculate Laplacian variance
            laplacian = cv2.Laplacian(gray, cv2.CV_64F)
            blur_score = laplacian.var()
            
            return blur_score
            
        except Exception as e:
            return 0.0
    
    def is_blurry(self, image: np.ndarray, threshold: float = 100.0) -> bool:
        """
        Check if image is blurry.
        
        Args:
            image: Image as numpy array
            threshold: Blur threshold
            
        Returns:
            True if image is blurry
        """
        blur_score = self.detect_blur(image)
        return blur_score < threshold