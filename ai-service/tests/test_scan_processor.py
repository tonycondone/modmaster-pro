import pytest
import numpy as np
from unittest.mock import Mock, patch, AsyncMock
from datetime import datetime

from app.services.scan_processor import ScanProcessor
from app.models.scan_models import ScanRequest, ScanType


@pytest.fixture
def scan_processor():
    return ScanProcessor()


@pytest.fixture
def mock_image():
    # Create a mock numpy array representing an image
    return np.zeros((480, 640, 3), dtype=np.uint8)


@pytest.fixture
def scan_request():
    return ScanRequest(
        scan_id="test-scan-123",
        scan_type=ScanType.ENGINE_BAY,
        images=["https://example.com/image1.jpg", "https://example.com/image2.jpg"],
        user_id="test-user-123",
        vehicle_id="test-vehicle-123"
    )


class TestScanProcessor:
    @pytest.mark.asyncio
    async def test_process_engine_bay_scan(self, scan_processor, scan_request, mock_image):
        # Mock dependencies
        with patch.object(scan_processor, '_download_image', return_value=mock_image) as mock_download:
            with patch('app.core.model_manager.model_manager.detect_objects') as mock_detect:
                # Mock detection results
                mock_detect.return_value = [
                    {
                        'class_id': 1,
                        'class_name': 'air_filter',
                        'confidence': 0.95,
                        'bbox': [100, 100, 200, 200]
                    },
                    {
                        'class_id': 2,
                        'class_name': 'exhaust',
                        'confidence': 0.87,
                        'bbox': [300, 300, 400, 400]
                    }
                ]

                # Mock part matcher
                with patch.object(scan_processor.part_matcher, 'match_detection') as mock_match:
                    mock_match.side_effect = [
                        {
                            'part_id': 'part-123',
                            'part_name': 'K&N Air Filter',
                            'modification_type': 'performance'
                        },
                        {
                            'part_id': 'part-456',
                            'part_name': 'HKS Exhaust System',
                            'modification_type': 'performance'
                        }
                    ]

                    # Process scan
                    result = await scan_processor.process_engine_bay_scan(scan_request)

                    # Assertions
                    assert len(result.detected_parts) == 2
                    assert result.detected_parts[0]['part_name'] == 'K&N Air Filter'
                    assert result.detected_parts[1]['part_name'] == 'HKS Exhaust System'
                    assert len(result.detected_modifications) == 2
                    assert result.confidence_score > 0.8
                    assert mock_download.call_count == 2

    @pytest.mark.asyncio
    async def test_process_vin_scan(self, scan_processor, mock_image):
        scan_request = ScanRequest(
            scan_id="test-scan-456",
            scan_type=ScanType.VIN,
            images=["https://example.com/vin.jpg"],
            user_id="test-user-123",
            vehicle_id=None
        )

        with patch.object(scan_processor, '_download_image', return_value=mock_image):
            with patch('app.core.model_manager.model_manager.detect_vin') as mock_detect_vin:
                mock_detect_vin.return_value = "JT2MA70JXP0123456"

                with patch.object(scan_processor, '_decode_vin') as mock_decode:
                    mock_decode.return_value = {
                        'make': 'Toyota',
                        'model': 'Supra',
                        'year': 1993,
                        'engine': '2JZ-GTE',
                        'trim': 'Turbo'
                    }

                    result = await scan_processor.process_vin_scan(scan_request)

                    assert result.detected_vin == "JT2MA70JXP0123456"
                    assert result.detected_vehicle_info['make'] == 'Toyota'
                    assert result.detected_vehicle_info['model'] == 'Supra'
                    assert result.confidence_score == 0.95

    @pytest.mark.asyncio
    async def test_download_image_from_url(self, scan_processor):
        mock_response = Mock()
        mock_response.content = b'fake_image_data'
        
        with patch('httpx.AsyncClient.get', return_value=mock_response):
            with patch('PIL.Image.open') as mock_open:
                mock_image = Mock()
                mock_array = np.zeros((480, 640, 3), dtype=np.uint8)
                mock_image.__array__ = Mock(return_value=mock_array)
                mock_open.return_value = mock_image

                result = await scan_processor._download_image("https://example.com/image.jpg")
                
                assert isinstance(result, np.ndarray)
                assert result.shape == (480, 640, 3)

    @pytest.mark.asyncio
    async def test_download_image_from_base64(self, scan_processor):
        base64_image = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBD"
        
        with patch('base64.b64decode', return_value=b'fake_image_data'):
            with patch('PIL.Image.open') as mock_open:
                mock_image = Mock()
                mock_array = np.zeros((480, 640, 3), dtype=np.uint8)
                mock_image.__array__ = Mock(return_value=mock_array)
                mock_open.return_value = mock_image

                result = await scan_processor._download_image(base64_image)
                
                assert isinstance(result, np.ndarray)

    def test_validate_vin_valid(self, scan_processor):
        valid_vin = "JT2MA70JXP0123456"
        assert scan_processor._validate_vin(valid_vin) is True

    def test_validate_vin_invalid_length(self, scan_processor):
        short_vin = "JT2MA70"
        assert scan_processor._validate_vin(short_vin) is False

    def test_validate_vin_invalid_chars(self, scan_processor):
        invalid_vin = "JT2MA7OIXP0123456"  # Contains 'O' and 'I'
        assert scan_processor._validate_vin(invalid_vin) is False

    def test_assess_image_quality(self, scan_processor, mock_image):
        quality = scan_processor._assess_image_quality(mock_image)
        
        assert 'resolution' in quality
        assert 'sharpness_score' in quality
        assert 'brightness' in quality
        assert 'quality_rating' in quality
        assert quality['resolution'] == '640x480'

    def test_calculate_scan_completeness(self, scan_processor):
        from app.models.scan_models import ScanResult
        
        # Test with complete scan
        complete_result = ScanResult(
            detected_parts=[{'part_id': '1'}, {'part_id': '2'}],
            detected_vin="JT2MA70JXP0123456",
            confidence_score=0.85
        )
        
        completeness = scan_processor._calculate_scan_completeness(complete_result)
        assert completeness > 0.7

        # Test with incomplete scan
        incomplete_result = ScanResult(
            detected_parts=[],
            detected_vin=None,
            confidence_score=0.3
        )
        
        completeness = scan_processor._calculate_scan_completeness(incomplete_result)
        assert completeness < 0.3