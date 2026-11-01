import re


def normalize_invite_code(value: str, *, legacy: bool = False) -> str:
    code = value.strip().upper()
    minimum = 4 if legacy else 6
    if not re.fullmatch(rf"[A-Z0-9-]{{{minimum},16}}", code):
        raise ValueError(f"Mã mời phải gồm {minimum}–16 ký tự chữ, số hoặc dấu gạch ngang.")
    return code
