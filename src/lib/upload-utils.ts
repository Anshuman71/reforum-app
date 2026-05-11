export const MAX_FILE_SIZE = 5 * 1024 * 1024

export const handleImageUpload = async (
  file: File,
  onProgress?: (event: { progress: number }) => void,
  abortSignal?: AbortSignal
): Promise<string> => {
  if (!file) {
    throw new Error("No file provided")
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      `File size exceeds maximum allowed (${MAX_FILE_SIZE / (1024 * 1024)}MB)`
    )
  }

  const prepareResponse = await fetch("/api/uploads/content/prepare", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "same-origin",
    body: JSON.stringify({
      filename: file.name,
      mimeType: file.type,
      size: file.size,
    }),
    signal: abortSignal,
  })

  const preparePayload = await prepareResponse.json()

  if (!prepareResponse.ok) {
    throw new Error(
      preparePayload?.error?.message ?? "Failed to prepare content image upload"
    )
  }

  const target = preparePayload as {
    strategy: "presigned" | "server"
    uploadUrl: string
    method: "PUT" | "POST"
    headers?: Record<string, string>
    storagePath: string
  }

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    xhr.open(target.method, target.uploadUrl, true)

    if (target.headers) {
      Object.entries(target.headers).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value)
      })
    }

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || event.total === 0) return
      onProgress?.({
        progress: Math.round((event.loaded / event.total) * 100),
      })
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.({ progress: 100 })
        resolve()
        return
      }

      reject(new Error("Failed to upload content image"))
    }

    xhr.onerror = () => reject(new Error("Failed to upload content image"))
    xhr.onabort = () => reject(new Error("Upload cancelled"))

    if (abortSignal) {
      abortSignal.addEventListener("abort", () => xhr.abort(), { once: true })
    }

    if (target.strategy === "presigned") {
      xhr.send(file)
      return
    }

    const formData = new FormData()
    formData.append("file", file)
    xhr.send(formData)
  })

  const completeResponse = await fetch("/api/uploads/content/complete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "same-origin",
    body: JSON.stringify({
      filename: file.name,
      mimeType: file.type,
      size: file.size,
      storagePath: target.storagePath,
    }),
    signal: abortSignal,
  })

  const completePayload = await completeResponse.json()

  if (!completeResponse.ok) {
    throw new Error(
      completePayload?.error?.message ?? "Failed to finalize content image upload"
    )
  }

  return (completePayload as { imageUrl: string }).imageUrl
}