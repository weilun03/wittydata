import { Client as MinioClient } from "minio";

export const minioClient = new MinioClient({
  endPoint: process.env.MINIO_ENDPOINT ?? "localhost",
  port: Number(process.env.MINIO_PORT ?? 9000),
  useSSL: process.env.MINIO_USE_SSL === "true",
  accessKey: process.env.MINIO_ACCESS_KEY ?? "",
  secretKey: process.env.MINIO_SECRET_KEY ?? "",
});

export const INVOICE_UPLOAD_BUCKET = process.env.MINIO_INVOICE_BUCKET ?? "invoice-uploads";

export async function ensureBucketExists(bucket: string) {
  const exists = await minioClient.bucketExists(bucket).catch(() => false);
  if (!exists) {
    await minioClient.makeBucket(bucket);
  }
}
