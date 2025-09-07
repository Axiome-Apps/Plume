# Progress System - Feature Specifications

## 📋 Context & Problem Statement

### Current Situation

The current compression progress system uses static, hardcoded values:

- 0% → 25% → 100% with arbitrary timing
- No correlation with actual compression duration
- Poor user experience with instant jumps

### Core Challenge

**Image compression time varies dramatically based on content complexity, not just file size:**

- Logo (500KB) → 50ms compression
- Complex photo (500KB) → 500ms compression
- **Same size, 10x time difference**

Traditional estimations based on `(format, file_size) → duration` are fundamentally flawed.

## 🔍 Research & Analysis

### Industry Comparison

- **TinyPNG**: Uses hybrid approach (real upload/download + simulated compression)
- **Squoosh**: Accepts approximation with smooth progression
- **Local installers**: Combine real progress (I/O) + estimation (processing)

### Technical Limitations Discovered

- **oxipng**: No progress callbacks, blocking API only
- **webp/mozjpeg**: No real-time progress available
- **File monitoring**: Non-linear compression makes size-based progress unreliable

### Key Insights from Research

1. **Content complexity** is the main factor, not file size
2. All popular tools accept **approximated progression**
3. Users expect **smooth, continuous progress** rather than accuracy
4. **Hybrid approaches** (real + estimated) are industry standard

## 🎯 Solution Options Evaluated

### Option A: Simple Database Estimation ✅ SELECTED

**Approach**: `(format, size, quality) → estimated_duration` with smooth interpolation

- **Pros**: Simple, maintainable, extensible
- **Cons**: Approximation only, can be inaccurate for edge cases
- **Complexity**: Low

### Option B: Image Complexity Analysis

**Approach**: Pre-analyze image complexity score before compression

```
complexity_score = w1*(width*height) + w2*(unique_colors/total_pixels)
                  + w3*(variance_per_block) + w4*(edge_transitions)
estimated_duration = f(complexity_score, size, format)
```

- **Pros**: More accurate, addresses core problem
- **Cons**: Requires calibration, additional processing time
- **Complexity**: Medium-High

### Option C: Threading + Adaptive Progress

**Approach**: Separate compression thread + smart progress estimation

- **Pros**: Can adapt in real-time
- **Cons**: Complex implementation, potential instability
- **Complexity**: High

### Option D: Hybrid Real + Estimated

**Approach**: Real progress for I/O operations + estimated for compression

- **Pros**: Combines real and estimated components
- **Cons**: Complex, limited real-progress opportunities in desktop app
- **Complexity**: High

## 🚀 V1 Implementation Plan

### Selected Approach: Option A (Simple + Smooth)

Following industry best practices (TinyPNG model), accept approximation in favor of smooth UX.

### Core Components

#### 1. Database Enhancement

```sql
ALTER TABLE compression_stats ADD COLUMN compression_time_ms INTEGER;
```

#### 2. Estimation Service

```rust
pub fn estimate_compression_time(
    input_format: &str,
    output_format: &str,
    file_size: u64,
    quality: u8
) -> Duration {
    // Query historical data with similar parameters
    // Return weighted average with fallback defaults
}
```

#### 3. Smooth Progress System

```typescript
interface ProgressConfig {
  estimated_duration_ms: number;
  update_interval_ms: number; // e.g., 50ms for smooth animation
  easing_function: 'linear' | 'ease_out' | 'bezier';
}

// Progress updates every 50ms with smooth interpolation
// Reaches 95% at estimated completion time
// Waits for actual completion to hit 100%
```

#### 4. Fallback System

```typescript
const DEFAULT_TIMES = {
  'PNG->WebP': { small: 200, medium: 800, large: 2000 },
  'PNG->PNG': { small: 500, medium: 1500, large: 4000 },
  'JPEG->WebP': { small: 150, medium: 600, large: 1500 },
};
```

### UX Design Principles

1. **Never go backwards** - progress only increases
2. **Smooth animation** - 50ms update intervals with easing
3. **Predictable completion** - reach 95% at estimated time, wait for real completion
4. **Graceful degradation** - fallback to defaults if estimation fails

## 📊 Success Metrics

### V1 Goals

- [ ] Smooth progress animation (no jumps)
- [ ] Progress completion aligns with actual compression end (±10%)
- [ ] No regression in compression performance
- [ ] Graceful handling of estimation failures

### Future Improvements (V2+)

- [ ] Image complexity analysis integration
- [ ] Machine learning for better predictions
- [ ] User feedback integration for calibration
- [ ] A/B testing different progress curves

## 🔧 Implementation Timeline

### Phase 1: Foundation (Current)

- [x] Database schema ready
- [x] Basic estimation system available
- [ ] Implement smooth progress animation
- [ ] Add time tracking to compression workflow

### Phase 2: Refinement

- [ ] Collect real usage data
- [ ] Calibrate default timing values
- [ ] Add progress curve customization

### Phase 3: Advanced Features

- [ ] Complexity analysis integration
- [ ] Machine learning enhancements
- [ ] Real-time adaptation

## 📝 Technical Notes

### Database Integration

- Leverage existing compression_stats table
- Add compression_time_ms column for learning
- Use statistical aggregation for predictions

### Frontend Implementation

- Update existing progress listener system
- Add smooth interpolation between progress events
- Implement progress curve algorithms

### Error Handling

- Graceful fallback to default timings
- Progress completion guarantee regardless of estimation accuracy
- User notification for unusual delays

---

**Status**: Ready for V1 implementation  
**Decision**: Proceed with Option A (Simple + Smooth)  
**Next**: Implement smooth progress system with database-backed estimation
