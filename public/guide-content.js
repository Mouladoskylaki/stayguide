export const FIELDS = [
  { id:'welcome', title:'Welcome & property', icon:'✳', hint:'Make guests feel at home.', fields:[['property_name','Property name','text','e.g. The Little Olive House'],['welcome','Welcome message','textarea','A few kind words to welcome your guests.']]},
  { id:'wifi', title:'Wi-Fi', icon:'⌁', hint:'The first thing every guest asks.', fields:[['wifi_name','Network name','text','e.g. OliveHouse_Guest'],['wifi_password','Wi-Fi password','text','Your network password']]},
  { id:'arrival', title:'Check-in & check-out', icon:'◷', hint:'Arrival and departure made easy.', fields:[['checkin','Check-in','textarea','e.g. From 3:00 PM. The entrance is on the garden side.'],['checkout','Check-out','textarea','e.g. Before 11:00 AM. Please leave keys on the table.']]},
  { id:'rules', title:'House rules', icon:'⌂', hint:'A few thoughtful ground rules.', fields:[['rules','House rules','textarea','e.g. No smoking indoors. Quiet hours after 10 PM.']]},
  { id:'appliances', title:'How things work', icon:'⚙', hint:'Appliances and useful instructions.', fields:[['appliances','Appliances & equipment','textarea','e.g. How to use the air conditioning, coffee machine and hot water.']]},
  { id:'parking', title:'Parking & transport', icon:'↗', hint:'Help them find their way.', fields:[['parking','Parking & getting around','textarea','e.g. Free parking in front of the property.']]},
  { id:'local_tips', title:'Local favourites', icon:'♡', hint:'Your best neighbourhood tips.', fields:[['local_tips','Places to explore','textarea','e.g. Our favourite bakery is two streets away.']]},
  { id:'emergency', title:'Emergency information', icon:'✚', hint:'Useful numbers and information.', fields:[['emergency','Emergency information','textarea','e.g. Emergency services: 112. Nearest hospital: ...']]},
  { id:'contact', title:'Contact your host', icon:'✉', hint:'An easy way to get in touch.', fields:[['contact','Contact details','textarea','e.g. Call or message on ...']]},
  { id:'additional', title:'Good to know', icon:'◎', hint:'Everything else worth sharing.', fields:[['additional','Additional information','textarea','e.g. Bin collection is on Tuesday.']]}
];
