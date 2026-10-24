/* Classic scripts intentionally support file:// without a server. */
window.FoodData = (() => {
  const groups = {
    Rice: [
      "Nasi Lemak",
      "Chicken Rice",
      "Nasi Goreng",
      "Nasi Kandar",
      "Banana Leaf Rice",
      "Biryani",
    ],
    Noodles: [
      "Char Kuey Teow",
      "Curry Laksa",
      "Hokkien Mee",
      "Wantan Mee",
      "Pan Mee",
      "Mee Goreng",
    ],
    Western: ["Chicken Chop", "Fish & Chips", "Spaghetti", "Pizza", "Steak"],
    "Fast Food": ["Burger", "Fried Chicken", "Sandwich", "Tacos"],
    Snacks: ["Roti Canai", "Satay", "Curry Puff", "Rojak", "Popiah"],
    Desserts: ["Cendol", "Ais Kacang", "Ice Cream", "Apam Balik"],
    Others: ["Dim Sum", "Yong Tau Foo", "Sushi", "Steamboat", "Korean BBQ"],
  };
  const icons = {
    Rice: "🍚",
    Noodles: "🍜",
    Western: "🍝",
    "Fast Food": "🍔",
    Snacks: "🥟",
    Desserts: "🍧",
    Others: "🍲",
  };
  return {
    groups,
    icons,
    iconChoices: [
      {icon:'🍚',label:'Rice'}, {icon:'🍜',label:'Noodles'},
      {icon:'🍝',label:'Pasta'}, {icon:'🍔',label:'Burger'},
      {icon:'🍕',label:'Pizza'}, {icon:'🍗',label:'Chicken'},
      {icon:'🥩',label:'Steak'}, {icon:'🐟',label:'Fish'},
      {icon:'🥟',label:'Dumpling'}, {icon:'🍣',label:'Sushi'},
      {icon:'🥗',label:'Salad'}, {icon:'🍲',label:'Hot pot'},
      {icon:'🍞',label:'Bread'}, {icon:'🍧',label:'Dessert'},
      {icon:'🍰',label:'Cake'}, {icon:'☕',label:'Coffee'},
    ],
    defaults: Object.entries(groups).flatMap(([category, names]) =>
      names.map((name, i) => ({ id: category + "-" + i, name, category })),
    ),
  };
})();
