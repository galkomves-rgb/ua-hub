from core.config import Settings


def test_settings_accepts_release_debug_string_as_false():
    settings = Settings(debug="release")
    assert settings.debug is False


def test_settings_accepts_debug_string_as_true():
    settings = Settings(debug="debug")
    assert settings.debug is True
