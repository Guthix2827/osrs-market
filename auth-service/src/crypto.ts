import {
    createCipheriv,
    createDecipheriv,
    createHash,
    randomBytes,
} from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

export const randomToken = (
    bytes = 32,
): string =>
    randomBytes(bytes).toString("base64url");

export const sha256 = (
    value: string,
): Buffer =>
    createHash("sha256")
        .update(value, "utf8")
        .digest();

export const encrypt = (
    value: string,
    key: Buffer,
): string => {
    const iv = randomBytes(IV_LENGTH);

    const cipher =
        createCipheriv(
            ALGORITHM,
            key,
            iv,
        );

    const ciphertext =
        Buffer.concat([
            cipher.update(value, "utf8"),
            cipher.final(),
        ]);

    const tag =
        cipher.getAuthTag();

    return [
        iv,
        tag,
        ciphertext,
    ]
        .map((part) =>
            part.toString("base64url"),
        )
        .join(".");
};

export const decrypt = (
    value: string,
    key: Buffer,
): string => {
    const parts =
        value.split(".");

    if (
        parts.length !== 3 ||
        parts.some((part) => !part)
    ) {
        throw new Error(
            "Invalid encrypted token format",
        );
    }

    const [
        ivPart,
        tagPart,
        ciphertextPart,
    ] = parts as [
        string,
        string,
        string,
    ];

    const decipher =
        createDecipheriv(
            ALGORITHM,
            key,
            Buffer.from(
                ivPart,
                "base64url",
            ),
        );

    decipher.setAuthTag(
        Buffer.from(
            tagPart,
            "base64url",
        ),
    );

    return Buffer.concat([
        decipher.update(
            Buffer.from(
                ciphertextPart,
                "base64url",
            ),
        ),
        decipher.final(),
    ]).toString("utf8");
};