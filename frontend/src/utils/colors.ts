export const getGradientForTitle = (title: string): string => {
  const hash = title.split("").reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  
  const gradients = [
    "linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)", // Blue
    "linear-gradient(135deg, #ff9a9e 0%, #fecfef 99%, #fecfef 100%)", // Pink
    "linear-gradient(135deg, #f6d365 0%, #fda085 100%)", // Orange/Yellow
    "linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)", // Green/Blue
    "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)", // Purple/Pink
    "linear-gradient(135deg, #ff0844 0%, #ffb199 100%)", // Red/Orange
    "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)", // Bright Green
    "linear-gradient(135deg, #fa709a 0%, #fee140 100%)", // Pink/Yellow
    "linear-gradient(135deg, #30cfd0 0%, #330867 100%)", // Teal/Purple
  ];
  
  return gradients[Math.abs(hash) % gradients.length];
};
