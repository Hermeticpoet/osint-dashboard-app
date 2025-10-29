exports.handleScan = (req, res) => {
  const { domain } = req.body;

  if (!domain) {
    return res.status(400).json({ error: 'Domain is required' });
  }

  res.json({ message: `Scan initiated for ${domain}` });
};
