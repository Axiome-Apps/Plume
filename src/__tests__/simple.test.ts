describe('Simple Test', () => {
  it('should run basic test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should test string operations', () => {
    expect('hello world'.toUpperCase()).toBe('HELLO WORLD');
  });

  it('should test array operations', () => {
    const arr = [1, 2, 3];
    expect(arr.length).toBe(3);
    expect(arr.includes(2)).toBe(true);
  });
});