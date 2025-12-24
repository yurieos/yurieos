// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { fileToDataUrl, useChatFiles } from "../use-chat-files";

describe("useChatFiles", () => {
  it("should initialize with empty pendingFiles", () => {
    const { result } = renderHook(() => useChatFiles());
    expect(result.current.pendingFiles).toEqual([]);
  });

  it("should add files when handleFileUpload is called", () => {
    const { result } = renderHook(() => useChatFiles());
    const file1 = new File(["content"], "test1.txt", { type: "text/plain" });
    const file2 = new File(["content"], "test2.txt", { type: "text/plain" });

    act(() => {
      result.current.handleFileUpload([file1]);
    });

    expect(result.current.pendingFiles).toHaveLength(1);
    expect(result.current.pendingFiles[0]).toBe(file1);

    act(() => {
      result.current.handleFileUpload([file2]);
    });

    expect(result.current.pendingFiles).toHaveLength(2);
    expect(result.current.pendingFiles[1]).toBe(file2);
  });

  it("should remove a specific file when handleFileRemove is called", () => {
    const { result } = renderHook(() => useChatFiles());
    const file1 = new File(["content"], "test1.txt", { type: "text/plain" });
    const file2 = new File(["content"], "test2.txt", { type: "text/plain" });

    act(() => {
      result.current.handleFileUpload([file1, file2]);
    });

    expect(result.current.pendingFiles).toHaveLength(2);

    act(() => {
      result.current.handleFileRemove(file1);
    });

    expect(result.current.pendingFiles).toHaveLength(1);
    expect(result.current.pendingFiles[0]).toBe(file2);
  });

  it("should clear all files when clearFiles is called", () => {
    const { result } = renderHook(() => useChatFiles());
    const file1 = new File(["content"], "test1.txt", { type: "text/plain" });

    act(() => {
      result.current.handleFileUpload([file1]);
    });

    expect(result.current.pendingFiles).toHaveLength(1);

    act(() => {
      result.current.clearFiles();
    });

    expect(result.current.pendingFiles).toEqual([]);
  });
});

describe("fileToDataUrl", () => {
  const originalFileReader = global.FileReader;

  afterEach(() => {
    global.FileReader = originalFileReader;
  });

  it("should resolve with data URL for a valid file", async () => {
    const file = new File(["hello"], "test.txt", { type: "text/plain" });

    // Create a mock class for FileReader
    class MockFileReader {
      onload: any = null;
      onerror: any = null;
      result: any = "data:text/plain;base64,aGVsbG8=";

      readAsDataURL(_blob: Blob) {
        if (this.onload) {
          this.onload({ target: { result: this.result } });
        }
      }
    }

    // @ts-expect-error
    global.FileReader = MockFileReader;

    const result = await fileToDataUrl(file);
    expect(result).toBe("data:text/plain;base64,aGVsbG8=");
  });

  it("should reject when FileReader errors", async () => {
    const file = new File(["hello"], "test.txt", { type: "text/plain" });

    class MockFileReaderError {
      onload: any = null;
      onerror: any = null;
      result: any = null;

      readAsDataURL(_blob: Blob) {
        if (this.onerror) {
          this.onerror(new Error("Read error"));
        }
      }
    }

    // @ts-expect-error
    global.FileReader = MockFileReaderError;

    await expect(fileToDataUrl(file)).rejects.toThrow("Failed to read file");
  });
});
