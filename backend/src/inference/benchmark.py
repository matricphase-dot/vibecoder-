# backend/src/inference/benchmark.py
import asyncio
import time
from src.inference.speculative_decoder import SpeculativeDecoder
import ollama

async def standard_generation(prompt: str, model="codellama", max_tokens=100):
    start = time.time()
    response = ollama.generate(model=model, prompt=prompt, options={"num_predict": max_tokens})
    elapsed = time.time() - start
    output_len = len(response.get('response', '').split())
    tokens_per_sec = output_len / elapsed if elapsed > 0 else 0
    return tokens_per_sec, elapsed

async def speculative_generation(prompt: str, draft="tinyllama", target="codellama", gamma=5, max_tokens=100):
    decoder = SpeculativeDecoder(draft_model=draft, target_model=target, gamma=gamma)
    start = time.time()
    tokens = []
    async for token in decoder.generate(prompt, max_tokens):
        tokens.append(token)
    elapsed = time.time() - start
    output_len = len(''.join(tokens).split())
    tokens_per_sec = output_len / elapsed if elapsed > 0 else 0
    return tokens_per_sec, elapsed

async def benchmark(prompt, max_tokens=100):
    print(f"Benchmarking with prompt: {prompt[:50]}...")
    std_tps, std_time = await standard_generation(prompt, max_tokens=max_tokens)
    print(f"Standard: {std_tps:.2f} tokens/sec, {std_time:.2f}s")
    spec_tps, spec_time = await speculative_generation(prompt, max_tokens=max_tokens)
    print(f"Speculative: {spec_tps:.2f} tokens/sec, {spec_time:.2f}s")
    speedup = spec_time / std_time if std_time > 0 else 0
    print(f"Speedup: {speedup:.2f}x")
    return speedup

if __name__ == "__main__":
    asyncio.run(benchmark("Write a function to compute factorial", max_tokens=100))
